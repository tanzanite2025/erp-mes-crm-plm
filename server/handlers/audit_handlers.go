package handlers

import (
	"net/http"
	"sort"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type auditEngineLogAggregate struct {
	Module    string
	LastEvent string
}

// GetDataTimelineHandler 获取指定对象的数据时间轴
func GetDataTimelineHandler(c *gin.Context) {
	module := c.Query("module")
	targetID := c.Query("target_id")

	if module == "" || targetID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] module and target_id are required"})
		return
	}

	moduleAliases := services.ExpandAuditModuleAliasesForQuery(module)
	if len(moduleAliases) == 0 {
		moduleAliases = []string{module}
	}

	var logs []models.AuditLog
	if err := db.DB.Where("module IN ? AND target_id = ?", moduleAliases, targetID).
		Order("created_at DESC").
		Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_DB_ERROR] failed to fetch data timeline: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func GetAuditEngineStatsHandler(c *gin.Context) {
	registry := services.GetAuditEntityRegistry()
	moduleOrder := services.GetAuditEngineModuleOrder()

	type moduleAccumulator struct {
		stats services.AuditEngineModuleStats
	}

	accumulators := make(map[string]*moduleAccumulator, len(moduleOrder))
	for _, moduleID := range moduleOrder {
		accumulators[moduleID] = &moduleAccumulator{
			stats: services.AuditEngineModuleStats{
				ID:                moduleID,
				ConnectedEntities: []string{},
				LoggedEntities:    []string{},
				EntryEntities:     []string{},
			},
		}
	}

	logAggregates := make([]auditEngineLogAggregate, 0)
	if err := db.DB.Model(&models.AuditLog{}).
		Select("module, MAX(created_at) as last_event").
		Group("module").
		Scan(&logAggregates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_DB_ERROR] failed to aggregate audit engine stats: " + err.Error()})
		return
	}

	loggedModuleLastEvent := make(map[string]string, len(logAggregates))
	for _, item := range logAggregates {
		normalized := services.NormalizeAuditModuleForStats(item.Module)
		if normalized == "" {
			continue
		}
		if current, ok := loggedModuleLastEvent[normalized]; !ok || item.LastEvent > current {
			loggedModuleLastEvent[normalized] = item.LastEvent
		}
	}

	for _, entry := range registry {
		accumulator, ok := accumulators[entry.EngineModule]
		if !ok {
			continue
		}

		accumulator.stats.TargetEntityCount++
		if entry.EntryIntegrated {
			accumulator.stats.EntryEntityCount++
			accumulator.stats.EntryEntities = append(accumulator.stats.EntryEntities, entry.Module)
		}

		if lastEvent, logged := loggedModuleLastEvent[entry.Module]; logged {
			accumulator.stats.LoggedEntityCount++
			accumulator.stats.LoggedEntities = append(accumulator.stats.LoggedEntities, entry.Module)
			if accumulator.stats.LastEvent == "" || lastEvent > accumulator.stats.LastEvent {
				accumulator.stats.LastEvent = lastEvent
			}
		}
	}

	modules := make([]services.AuditEngineModuleStats, 0, len(moduleOrder))
	for _, moduleID := range moduleOrder {
		stats := accumulators[moduleID].stats
		if stats.TargetEntityCount > 0 {
			stats.LogCoverage = float64(stats.LoggedEntityCount) / float64(stats.TargetEntityCount) * 100
			stats.EntryCoverage = float64(stats.EntryEntityCount) / float64(stats.TargetEntityCount) * 100
			stats.Coverage = (stats.LogCoverage + stats.EntryCoverage) / 2
		}
		stats.Connected = stats.LoggedEntityCount > 0 && stats.EntryEntityCount > 0
		switch {
		case stats.Connected && stats.LoggedEntityCount == stats.TargetEntityCount && stats.EntryEntityCount == stats.TargetEntityCount:
			stats.Status = "HEALTHY"
		case stats.LoggedEntityCount > 0 || stats.EntryEntityCount > 0:
			stats.Status = "ALERT"
		default:
			stats.Status = "CRITICAL"
		}
		stats.ConnectedEntities = append([]string{}, stats.EntryEntities...)
		sort.Strings(stats.ConnectedEntities)
		sort.Strings(stats.LoggedEntities)
		sort.Strings(stats.EntryEntities)
		modules = append(modules, stats)
	}

	c.JSON(http.StatusOK, services.AuditEngineStatsResponse{Modules: modules})
}

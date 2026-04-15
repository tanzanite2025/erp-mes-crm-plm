package services

import (
	"sort"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type AuditEngineModuleStats struct {
	ID                string   `json:"id"`
	TargetEntityCount  int      `json:"targetEntityCount"`
	LoggedEntityCount  int      `json:"loggedEntityCount"`
	EntryEntityCount   int      `json:"entryEntityCount"`
	Coverage          float64  `json:"coverage"`
	LogCoverage       float64  `json:"logCoverage"`
	EntryCoverage     float64  `json:"entryCoverage"`
	Connected         bool     `json:"connected"`
	Status            string   `json:"status"`
	LastEvent         string   `json:"lastEvent,omitempty"`
	ConnectedEntities []string `json:"connectedEntities"`
	LoggedEntities    []string `json:"loggedEntities"`
	EntryEntities     []string `json:"entryEntities"`
}

type AuditEngineStatsResponse struct {
	Modules []AuditEngineModuleStats `json:"modules"`
}

type auditEngineLogAggregate struct {
	Module    string
	LastEvent string
}

// BuildAuditEngineStats aggregates the audit engine view model from the audit log and registry.
func BuildAuditEngineStats(db *gorm.DB) (AuditEngineStatsResponse, error) {
	registry := GetAuditEntityRegistry()
	moduleOrder := GetAuditEngineModuleOrder()

	type moduleAccumulator struct {
		stats AuditEngineModuleStats
	}

	accumulators := make(map[string]*moduleAccumulator, len(moduleOrder))
	for _, moduleID := range moduleOrder {
		accumulators[moduleID] = &moduleAccumulator{
			stats: AuditEngineModuleStats{
				ID:             moduleID,
				ConnectedEntities: []string{},
				LoggedEntities:    []string{},
				EntryEntities:     []string{},
			},
		}
	}

	logAggregates := make([]auditEngineLogAggregate, 0)
	if err := db.Model(&models.AuditLog{}).
		Select("module, MAX(created_at) as last_event").
		Group("module").
		Scan(&logAggregates).Error; err != nil {
		return AuditEngineStatsResponse{}, err
	}

	loggedModuleLastEvent := make(map[string]string, len(logAggregates))
	for _, item := range logAggregates {
		normalized := NormalizeAuditModuleForStats(item.Module)
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
			accumulator.stats.EntryEntities = append(accumulator.stats.EntryEntities, entry.EntityKey)
		}

		if lastEvent, logged := loggedModuleLastEvent[entry.EntityKey]; logged {
			accumulator.stats.LoggedEntityCount++
			accumulator.stats.LoggedEntities = append(accumulator.stats.LoggedEntities, entry.EntityKey)
			if accumulator.stats.LastEvent == "" || lastEvent > accumulator.stats.LastEvent {
				accumulator.stats.LastEvent = lastEvent
			}
		}
	}

	modules := make([]AuditEngineModuleStats, 0, len(moduleOrder))
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

	return AuditEngineStatsResponse{Modules: modules}, nil
}

// GetAuditEngineModuleOrder returns the display order for engine modules.
func GetAuditEngineModuleOrder() []string {
	order := []string{
		AuditEngineModuleTrading,
		AuditEngineModuleFinance,
		AuditEngineModuleEquipment,
		AuditEngineModuleEngineering,
		AuditEngineModuleWarehouse,
	}
	return append([]string{}, order...)
}

// IsRecentEvent is a small helper for stats consumers.
func IsRecentEvent(lastEvent string, within time.Duration) bool {
	if strings.TrimSpace(lastEvent) == "" {
		return false
	}
	parsed, err := time.Parse(time.RFC3339Nano, lastEvent)
	if err != nil {
		return false
	}
	return time.Since(parsed) <= within
}

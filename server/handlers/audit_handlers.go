package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

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
	stats, err := services.BuildAuditEngineStats(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_DB_ERROR] failed to aggregate audit engine stats: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

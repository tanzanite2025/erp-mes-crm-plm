package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

/**
 * GetExcellentRankingHandler - 优秀员工排名接口。
 * 直接调用后端权威计算引擎。
 */
func GetExcellentRankingHandler(c *gin.Context) {
	rankings, err := services.DefaultPersonnelAnalyticsService.GetExcellentRanking()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate personnel analytics"})
		return
	}
	c.JSON(http.StatusOK, rankings)
}

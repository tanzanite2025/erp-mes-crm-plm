package handlers

import (
	"net/http"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

type DashboardMetricAvailability struct {
	Connected bool `json:"connected"`
}

type DashboardMetricAvailabilityMap struct {
	WIP              DashboardMetricAvailability `json:"wip"`
	Scrap            DashboardMetricAvailability `json:"scrap"`
	ScrapDelta       DashboardMetricAvailability `json:"scrapDelta"`
	GapOrders        DashboardMetricAvailability `json:"gapOrders"`
	GapDescription   DashboardMetricAvailability `json:"gapDescription"`
	TotalSN          DashboardMetricAvailability `json:"totalSn"`
	ProductionFunnel DashboardMetricAvailability `json:"productionFunnel"`
}

type DashboardFunnelItem struct {
	Name  string `json:"name"`
	Value int64  `json:"value"`
}

type DashboardStatsResponse struct {
	WIP              float64                        `json:"wip"`
	Scrap            int64                          `json:"scrap"`
	ScrapDelta       int64                          `json:"scrapDelta"`
	GapOrders        int64                          `json:"gapOrders"`
	GapDescription   string                         `json:"gapDescription"`
	TotalSN          int64                          `json:"totalSn"`
	ProductionFunnel []DashboardFunnelItem          `json:"productionFunnel"`
	Availability     DashboardMetricAvailabilityMap `json:"availability"`
}

func defaultDashboardAvailability() DashboardMetricAvailabilityMap {
	return DashboardMetricAvailabilityMap{
		WIP:              DashboardMetricAvailability{Connected: true},
		Scrap:            DashboardMetricAvailability{Connected: false},
		ScrapDelta:       DashboardMetricAvailability{Connected: false},
		GapOrders:        DashboardMetricAvailability{Connected: true},
		GapDescription:   DashboardMetricAvailability{Connected: false},
		TotalSN:          DashboardMetricAvailability{Connected: false},
		ProductionFunnel: DashboardMetricAvailability{Connected: false},
	}
}

func GetDashboardStatsHandler(c *gin.Context) {
	response := DashboardStatsResponse{
		WIP:              0,
		Scrap:            0,
		ScrapDelta:       0,
		GapOrders:        0,
		GapDescription:   "",
		TotalSN:          0,
		ProductionFunnel: []DashboardFunnelItem{},
		Availability:     defaultDashboardAvailability(),
	}

	now := time.Now()

	if err := db.DB.Model(&models.ProductionPlan{}).
		Where("status IN ?", []string{"IN_PROGRESS", "SCHEDULED"}).
		Select("COALESCE(SUM(quantity), 0)").
		Scan(&response.WIP).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取首页在制统计失败: " + err.Error()})
		return
	}

	if err := db.DB.Model(&models.ProductionPlan{}).
		Where("status != ? AND end_date < ?", "COMPLETED", now).
		Count(&response.GapOrders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取首页交付缺口统计失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

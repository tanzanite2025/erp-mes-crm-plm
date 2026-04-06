package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

// AssetDashboardStats 资产看板统计数据结构
type AssetDashboardStats struct {
	MoldStats struct {
		Total       int64 `json:"total"`
		Idle        int64 `json:"idle"`
		InUse       int64 `json:"inUse"`
		Maintenance int64 `json:"maintenance"`
		Fault       int64 `json:"fault"`
	} `json:"moldStats"`
	FurnaceStats struct {
		Total   int64 `json:"total"`
		Idle    int64 `json:"idle"`
		Running int64 `json:"running"`
		Fault   int64 `json:"fault"`
	} `json:"furnaceStats"`
	HealthVectors struct {
		AvgLifeConsumpt float64 `json:"avgLifeConsumpt"` // 模具平均寿命消耗比
		AlertCount      int64   `json:"alertCount"`      // 异常模具数量
	} `json:"healthVectors"`
	RecentActivities []models.MoldLoan `json:"recentActivities"` // 最近借还动态
}

// GetAssetDashboardStatsHandler 聚合资产看板数据
func GetAssetDashboardStatsHandler(c *gin.Context) {
	var stats AssetDashboardStats

	// 1. 模具状态统计
	db.DB.Model(&models.Mold{}).Count(&stats.MoldStats.Total)
	db.DB.Model(&models.Mold{}).Where("status = ?", "IDLE").Count(&stats.MoldStats.Idle)
	db.DB.Model(&models.Mold{}).Where("status = ?", "IN_USE").Count(&stats.MoldStats.InUse)
	db.DB.Model(&models.Mold{}).Where("status IN ?", []string{"CHECKING", "MAINTENANCE"}).Count(&stats.MoldStats.Maintenance)
	db.DB.Model(&models.Mold{}).Where("status = ?", "RETIRED").Count(&stats.MoldStats.Fault)

	// 2. 炉台状态统计
	db.DB.Model(&models.Furnace{}).Count(&stats.FurnaceStats.Total)
	db.DB.Model(&models.Furnace{}).Where("status = ?", "IDLE").Count(&stats.FurnaceStats.Idle)
	db.DB.Model(&models.Furnace{}).Where("status IN ?", []string{"HEATING", "COOLING"}).Count(&stats.FurnaceStats.Running)
	db.DB.Model(&models.Furnace{}).Where("status = ?", "FAULT").Count(&stats.FurnaceStats.Fault)

	// 3. 健康矢量计算
	var molds []models.Mold
	db.DB.Find(&molds)
	if len(molds) > 0 {
		var totalConsumpt float64
		for _, m := range molds {
			if m.MaxCycles > 0 {
				totalConsumpt += float64(m.CurrentCycles) / float64(m.MaxCycles)
			}
			if m.IsAlerted {
				stats.HealthVectors.AlertCount++
			}
		}
		stats.HealthVectors.AvgLifeConsumpt = (totalConsumpt / float64(len(molds))) * 100
	}

	// 4. 最近活动动态
	db.DB.Order("created_at desc").Limit(10).Find(&stats.RecentActivities)

	c.JSON(http.StatusOK, stats)
}

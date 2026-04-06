package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetProductionPlansHandler 获取生产计划 (支持分页与看板聚合)
func GetProductionPlansHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	status := c.Query("status")
	orderNo := c.Query("orderNo")

	query := db.DB.Model(&models.ProductionPlan{}).Preload("Tasks")
	
	if status != "" && status != "ALL" {
		query = query.Where("status = ?", status)
	}
	if orderNo != "" {
		query = query.Where("order_no LIKE ?", "%"+orderNo+"%")
	}

	var total int64
	query.Count(&total)

	var plans []models.ProductionPlan
	err := query.Order("created_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&plans).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取生产计划失败: " + err.Error()})
		log.Printf("[ERR] Fetch Plans: %v", err)
		return
	}

	c.JSON(http.StatusOK, services.ProductionPlansListResponse{
		Items:    services.MapProductionPlansToResponse(plans),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// SaveProductionPlanHandler 保存生产计划 (原子事务)
func SaveProductionPlanHandler(c *gin.Context) {
	var plan models.ProductionPlan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 生产计划格式错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 1. 如果有关联销售订单，验证其存在性
		if plan.OrderID != "" {
			var order models.SalesOrder
			if err := tx.First(&order, "id = ?", plan.OrderID).Error; err != nil {
				return gorm.ErrRecordNotFound
			}
		}

		// 2. 区分新增与更新，防止元数据全量擦除
		if plan.ID != "" {
			// 更新模式：局部更新主表字段，防止擦除 CreatedAt
			if err := tx.Model(&plan).Omit("CreatedAt", "Tasks").Updates(&plan).Error; err != nil {
				return err
			}
			// 同步生产任务关联 (GORM 会自动处理删除、更新、新增)
			if err := tx.Model(&plan).Association("Tasks").Replace(plan.Tasks); err != nil {
				return err
			}
		} else {
			// 新增模式：直接 Save (会触发 Create)
			if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Save(&plan).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存生产计划失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, plan)
}

// GetProductionStatsHandler 获取看板核心统计指标
func GetProductionStatsHandler(c *gin.Context) {
	var stats models.ProductionStats
	today := time.Now().Truncate(24 * time.Hour)

	// 1. 累计指标
	db.DB.Model(&models.ProductionPlan{}).Count(&stats.TotalPlans)
	db.DB.Model(&models.ProductionPlan{}).Select("SUM(quantity)").Scan(&stats.TotalQuantity)

	// 2. 运行时指标 (WIP)
	db.DB.Model(&models.ProductionPlan{}).
		Where("status IN ?", []string{"IN_PROGRESS", "SCHEDULED"}).
		Select("SUM(quantity)").Scan(&stats.ActiveWIP)

	// 3. 今日完工
	db.DB.Model(&models.ProductionTask{}).
		Where("status = ? AND completed_at >= ?", "DONE", today).
		Select("COUNT(*)").Scan(&stats.CompletedToday)

	// 4. 逾期预警
	db.DB.Model(&models.ProductionPlan{}).
		Where("status != ? AND end_date < ?", "COMPLETED", time.Now()).
		Count(&stats.DelayedCount)

	c.JSON(http.StatusOK, services.MapProductionStatsToResponse(stats))
}

// GetOrderProgressHandler 聚合订单进度 (看板专用)
func GetOrderProgressHandler(c *gin.Context) {
	results := make([]services.OrderProgressItemResponse, 0)
	// 联表查询：销售订单 + 生产计划汇总
	query := `
		SELECT 
			so.id, 
			so.order_no, 
			so.customer_name as customer, 
			so.quantity as target,
			COALESCE((SELECT SUM(pp.quantity) FROM production_plans pp WHERE pp.order_id = so.id AND pp.status = 'COMPLETED'), 0) as completed,
			COALESCE((SELECT SUM(pp.quantity) FROM production_plans pp WHERE pp.order_id = so.id AND pp.status = 'IN_PROGRESS'), 0) as wip
		FROM sales_orders so
		WHERE so.is_deleted = false
		ORDER BY so.created_at DESC
		LIMIT 20
	`
	if err := db.DB.Raw(query).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取订单进度失败: " + err.Error()})
		log.Printf("[ERR] Order Progress: %v", err)
		return
	}

	c.JSON(http.StatusOK, results)
}

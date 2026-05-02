package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetProductionPlansHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	status := c.Query("status")
	orderNo := c.Query("orderNo")

	if status != "" && status != "ALL" && !services.IsProductionPlanStatus(status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 非法生产计划状态: " + status})
		return
	}

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

func SaveProductionPlanHandler(c *gin.Context) {
	var plan models.ProductionPlan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 生产计划格式错误: " + err.Error()})
		return
	}
	if err := services.ValidateProductionPlanStatuses(plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var previousPlan models.ProductionPlan
		hasPreviousPlan := false
		if strings.TrimSpace(plan.ID) != "" {
			if err := tx.Preload("Tasks").Where("id = ?", strings.TrimSpace(plan.ID)).First(&previousPlan).Error; err == nil {
				hasPreviousPlan = true
			} else if err != nil && err != gorm.ErrRecordNotFound {
				return err
			}
		}

		if plan.OrderID != "" {
			var order models.SalesOrder
			if err := tx.First(&order, "id = ?", plan.OrderID).Error; err != nil {
				return gorm.ErrRecordNotFound
			}
		}

		if plan.ID != "" {
			if err := tx.Model(&plan).Omit("CreatedAt", "Tasks").Updates(&plan).Error; err != nil {
				return err
			}
			if err := tx.Model(&plan).Association("Tasks").Replace(plan.Tasks); err != nil {
				return err
			}
		} else {
			if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Save(&plan).Error; err != nil {
				return err
			}
		}

		var savedPlan models.ProductionPlan
		if err := tx.Preload("Tasks").Where("id = ?", plan.ID).First(&savedPlan).Error; err != nil {
			return err
		}
		previousPlanStatus := ""
		previousTaskStatusByID := map[string]string{}
		if hasPreviousPlan {
			previousPlanStatus = previousPlan.Status
			for _, task := range previousPlan.Tasks {
				previousTaskStatusByID[task.ID] = task.Status
			}
		}
		if err := services.DispatchProductionPlanStatusChangedTx(tx, savedPlan, previousPlanStatus, savedPlan.Status, "", ""); err != nil {
			return err
		}
		for _, task := range savedPlan.Tasks {
			if err := services.DispatchProductionTaskStatusChangedTx(tx, savedPlan, task, previousTaskStatusByID[task.ID], task.Status, "", task.Operator); err != nil {
				return err
			}
		}
		plan = savedPlan

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存生产计划失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.MapProductionPlansToResponse([]models.ProductionPlan{plan})[0])
}

func GetProductionStatsHandler(c *gin.Context) {
	var stats models.ProductionStats
	today := time.Now().Truncate(24 * time.Hour)

	db.DB.Model(&models.ProductionPlan{}).Count(&stats.TotalPlans)
	db.DB.Model(&models.ProductionPlan{}).Select("SUM(quantity)").Scan(&stats.TotalQuantity)

	db.DB.Model(&models.ProductionPlan{}).
		Where("status IN ?", []string{"IN_PROGRESS", "SCHEDULED"}).
		Select("SUM(quantity)").Scan(&stats.ActiveWIP)

	db.DB.Model(&models.ProductionTask{}).
		Where("status = ? AND completed_at >= ?", "DONE", today).
		Select("COUNT(*)").Scan(&stats.CompletedToday)

	db.DB.Model(&models.ProductionPlan{}).
		Where("status != ? AND end_date < ?", "COMPLETED", time.Now()).
		Count(&stats.DelayedCount)

	c.JSON(http.StatusOK, services.ProductionStatsEnvelopeResponse{Item: services.MapProductionStatsToResponse(stats)})
}

func GetOrderProgressHandler(c *gin.Context) {
	results := make([]services.OrderProgressItemResponse, 0)
	query := `
		SELECT 
			so.id, 
			so.order_no, 
			so.customer_name as customer, 
			so.quantity as target,
			COALESCE((SELECT SUM(pp.quantity) FROM production_plans pp WHERE pp.order_id = so.id AND pp.status = 'COMPLETED'), 0) as completed,
			COALESCE((SELECT SUM(pp.quantity) FROM production_plans pp WHERE pp.order_id = so.id AND pp.status = 'IN_PROGRESS'), 0) as wip
		FROM sales_orders so
		WHERE so.deleted_at IS NULL
		ORDER BY so.created_at DESC
		LIMIT 20
	`
	if err := db.DB.Raw(query).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取订单进度失败: " + err.Error()})
		log.Printf("[ERR] Order Progress: %v", err)
		return
	}

	c.JSON(http.StatusOK, services.OrderProgressListResponse{Items: results})
}

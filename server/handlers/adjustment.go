package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GenerateAdjustmentNo 生成调账单号: ADJUST-YYYYMMDD-XXX
func GenerateAdjustmentNo(tx *gorm.DB) string {
	dateStr := time.Now().Format("20060102")
	var count int64
	tx.Model(&models.InventoryAdjustment{}).Where("adjustment_no LIKE ?", "ADJUST-"+dateStr+"-%").Count(&count)
	return fmt.Sprintf("ADJUST-%s-%03d", dateStr, count+1)
}

// SubmitAdjustmentApprovalHandler 提交盘点调账审批
func SubmitAdjustmentApprovalHandler(c *gin.Context) {
	taskId := c.Param("taskId")
	var task models.StocktakeTask
	if err := db.DB.First(&task, "id = ?", taskId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "盘点任务不存在"})
		return
	}

	if task.Status != "IN_PROGRESS" && task.Status != "COMPLETED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该盘点任务当前状态不支持调账提报"})
		return
	}

	// 【加固】防止重复提报: 检查是否已有 PENDING 的调账单
	var existCount int64
	db.DB.Model(&models.InventoryAdjustment{}).Where("task_id = ? AND status = ?", taskId, "PENDING").Count(&existCount)
	if existCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该任务已存在待处理的调账申请，请勿重复操作"})
		return
	}

	// 1. 获取盘点明细
	var items []models.StocktakeItem
	if err := db.DB.Where("task_id = ?", taskId).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取盘点明细失败"})
		return
	}

	username := middleware.GetSafeUsername(c)
	
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 2. 创建调账记录 (Header)
		adjustment := models.InventoryAdjustment{
			TaskID:       taskId,
			AdjustmentNo: GenerateAdjustmentNo(tx),
			Type:         "STOCKTAKE",
			Status:       "PENDING",
			CreatedBy:    username,
			TotalItems:   len(items),
			Reason:       fmt.Sprintf("盘点任务 [%s] 的盈亏自动调账申请", task.Title),
		}
		if err := tx.Create(&adjustment).Error; err != nil {
			return err
		}

		// 3. 转换明细
		for _, item := range items {
			diff := item.ActualQty - item.TheoryQty
			if diff == 0 {
				continue // 既然没差异，就不产生调账行，保持流水整洁
			}
			
			adjItem := models.InventoryAdjustmentItem{
				AdjustmentID: adjustment.ID,
				MaterialID:   item.MaterialID,
				MaterialCode: item.MaterialCode,
				MaterialName: item.MaterialName,
				CategoryCode: task.WarehouseCategoryCode,
				BatchNo:      item.BatchNo,
				TheoryQty:    item.TheoryQty,
				ActualQty:    item.ActualQty,
				DiffQty:      diff,
				UOM:          item.UOM,
			}
			if err := tx.Create(&adjItem).Error; err != nil {
				return err
			}
		}

		// 4. 发起审批申请 (与审批中心对接)
		// 假设已有 ApprovalConfig 配置，Action="ADJUST", Module="Warehouse"
		var config models.ApprovalConfig
		if err := tx.Where("module = ? AND action = ?", "Warehouse", "ADJUST").First(&config).Error; err != nil {
			return errors.New("系统未配置 [Warehouse:ADJUST] 审批职责，请先配置")
		}

		// 关联 User 获取 RequesterID (此处简化为从模型查找)
		var user models.User
		tx.Where("username = ?", username).First(&user)

		approval := models.ApprovalRequest{
			ConfigID:    config.ID,
			RequesterID: user.ID,
			TargetID:    adjustment.ID,
			Reason:      adjustment.Reason,
			Module:      "Warehouse",
			Action:      "ADJUST",
			Status:      "PENDING",
		}
		
		return tx.Create(&approval).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 提交审批失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "调账单已生成且审批已发起"})
}

// ExecuteAdjustmentHandler 执行调账 (由审批回调或财务确认调用)
func ExecuteAdjustmentHandler(c *gin.Context) {
	id := c.Param("id")
	
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 【加固】事务内锁行校验，杜绝双重执行
		var adj models.InventoryAdjustment
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Items").First(&adj, "id = ?", id).Error; err != nil {
			return errors.New("调账记录不存在或已被锁定")
		}

		if adj.Status == "EXECUTED" {
			return errors.New("该调账单已经执行过，请勿重复操作")
		}

		// 1. 遍历明细更新库存
		for _, item := range adj.Items {
			var inv models.Inventory
			// 【并发加固】行锁获取最新库存
			err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("material_id = ? AND category_code = ? AND batch_no = ?", 
					item.MaterialID, item.CategoryCode, item.BatchNo).
				First(&inv).Error

			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 如果对应的库位+批次记录被删了，需要重建 (尤其是盘盈场景)
				inv = models.Inventory{
					MaterialID:   item.MaterialID,
					MaterialCode: item.MaterialCode,
					MaterialName: item.MaterialName,
					CategoryCode: item.CategoryCode,
					BatchNo:      item.BatchNo,
					Quantity:     item.ActualQty, // 调账后的最终数量
				}
				if err := tx.Create(&inv).Error; err != nil {
					return err
				}
			} else if err != nil {
				return err
			} else {
				// 更新数量为“盘点实况”
				if err := tx.Model(&inv).Update("quantity", item.ActualQty).Error; err != nil {
					return err
				}
			}
		}

		// 2. 更新状态
		if err := tx.Model(&adj).Update("status", "EXECUTED").Error; err != nil {
			return err
		}

		// 3. 更新原始盘点任务状态
		if adj.TaskID != "" {
			tx.Model(&models.StocktakeTask{}).Where("id = ?", adj.TaskID).Update("status", "ADJUSTED")
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 调账失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "调账执行成功，库存已更新"})
}

// GetAdjustmentHistoryHandler 获取调账历史报表
func GetAdjustmentHistoryHandler(c *gin.Context) {
	var results []models.InventoryAdjustment
	if err := db.DB.Order("created_at desc").Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取调账历史失败"})
		return
	}
	c.JSON(http.StatusOK, results)
}

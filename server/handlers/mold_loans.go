package handlers

import (
	"net/http"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetLoansHandler 获取借还记录
func GetLoansHandler(c *gin.Context) {
	var loans []models.MoldLoan
	if err := db.DB.Order("created_at desc").Find(&loans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取记录失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, loans)
}

// CreateLoanWithStatusHandler 【聚合事务接口】创建借单并原子更新模具状态 (解决原子性断裂风险)
func CreateLoanWithStatusHandler(c *gin.Context) {
	var input struct {
		Loan       models.MoldLoan `json:"loan"`
		MoldStatus string          `json:"moldStatus"` // 对应 LENT_OUT 或 BORROWED
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的借还数据: " + err.Error()})
		return
	}

	operatorStr := middleware.GetSafeUsername(c)
	
	input.Loan.LoanDate = time.Now()
	input.Loan.CreatedAt = time.Now()

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 1. 保存借还记录
		if err := tx.Create(&input.Loan).Error; err != nil {
			return err
		}

		// 2. 原子更新模具表状态
		if err := tx.Model(&models.Mold{}).Where("id = ?", input.Loan.MoldID).Updates(map[string]interface{}{
			"status":     input.MoldStatus,
			"updated_at": time.Now(),
			"updated_by": operatorStr,
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 原子操作执行失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, input.Loan)
}

// ReturnLoanHandler 归还记录处理
func ReturnLoanHandler(c *gin.Context) {
	id := c.Param("id")
	var loan models.MoldLoan
	
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ?", id).First(&loan).Error; err != nil {
			return err
		}

		now := time.Now()
		// 1. 更新记录为已归还
		if err := tx.Model(&loan).Updates(map[string]interface{}{
			"status":             "RETURNED",
			"actual_return_date": now,
		}).Error; err != nil {
			return err
		}

		// 2. 将模具状态拨回 IDLE (或 CHECKING)
		if err := tx.Model(&models.Mold{}).Where("id = ?", loan.MoldID).Update("status", "IDLE").Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 归还失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, loan)
}

package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
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

	loan, err := services.NewEquipmentAssetService(db.DB).CreateMoldLoan(auditContextFromGin(c), input.Loan, input.MoldStatus)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 原子操作执行失败: ")
		return
	}

	c.JSON(http.StatusOK, loan)
}

// ReturnLoanHandler 归还记录处理
func ReturnLoanHandler(c *gin.Context) {
	id := c.Param("id")
	loan, err := services.NewEquipmentAssetService(db.DB).ReturnMoldLoan(auditContextFromGin(c), id)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 归还失败: ")
		return
	}
	c.JSON(http.StatusOK, loan)
}

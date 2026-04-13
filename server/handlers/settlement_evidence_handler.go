package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func settlementEvidenceOperatorFromContext(c *gin.Context) string {
	userID, _ := c.Get("userId")
	if value, ok := userID.(string); ok && strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	username, _ := c.Get("username")
	if value, ok := username.(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}

func writeSettlementEvidenceError(c *gin.Context, err error, action string) {
	switch {
	case errors.Is(err, services.ErrSettlementRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "结算记录不存在"})
	case errors.Is(err, services.ErrSettlementEvidenceNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "记录证据不存在"})
	case errors.Is(err, services.ErrSettlementRecordTypeInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": "结算记录类型无效"})
	case errors.Is(err, services.ErrSettlementEvidenceFileInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": "证据文件信息不能为空"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": action})
	}
}

func GetReceiptRecordEvidencesHandler(c *gin.Context) {
	response, err := services.ListReceiptRecordEvidences(c.Param("id"))
	if err != nil {
		writeSettlementEvidenceError(c, err, "获取收款记录证据失败")
		return
	}
	c.JSON(http.StatusOK, response)
}

func CreateReceiptRecordEvidenceHandler(c *gin.Context) {
	var req services.CreateSettlementRecordEvidenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "收款记录证据参数错误: " + err.Error()})
		return
	}
	response, err := services.CreateReceiptRecordEvidence(c.Param("id"), req, settlementEvidenceOperatorFromContext(c))
	if err != nil {
		writeSettlementEvidenceError(c, err, "创建收款记录证据失败")
		return
	}
	c.JSON(http.StatusOK, response)
}

func DeleteReceiptRecordEvidenceHandler(c *gin.Context) {
	if err := services.DeleteReceiptRecordEvidence(c.Param("id"), c.Param("evidenceId")); err != nil {
		writeSettlementEvidenceError(c, err, "删除收款记录证据失败")
		return
	}
	c.Status(http.StatusNoContent)
}

func GetPaymentRecordEvidencesHandler(c *gin.Context) {
	response, err := services.ListPaymentRecordEvidences(c.Param("id"))
	if err != nil {
		writeSettlementEvidenceError(c, err, "获取付款记录证据失败")
		return
	}
	c.JSON(http.StatusOK, response)
}

func CreatePaymentRecordEvidenceHandler(c *gin.Context) {
	var req services.CreateSettlementRecordEvidenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "付款记录证据参数错误: " + err.Error()})
		return
	}
	response, err := services.CreatePaymentRecordEvidence(c.Param("id"), req, settlementEvidenceOperatorFromContext(c))
	if err != nil {
		writeSettlementEvidenceError(c, err, "创建付款记录证据失败")
		return
	}
	c.JSON(http.StatusOK, response)
}

func DeletePaymentRecordEvidenceHandler(c *gin.Context) {
	if err := services.DeletePaymentRecordEvidence(c.Param("id"), c.Param("evidenceId")); err != nil {
		writeSettlementEvidenceError(c, err, "删除付款记录证据失败")
		return
	}
	c.Status(http.StatusNoContent)
}

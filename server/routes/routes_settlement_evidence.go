package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerSettlementEvidenceRoutes(authorized *gin.RouterGroup) {
	tradingRead := middleware.RequirePermissions(authz.MenuTrading)

	receiptRecords := authorized.Group("/receipt-records")
	{
		receiptRecords.GET("/:id/evidences", tradingRead, handlers.GetReceiptRecordEvidencesHandler)
		receiptRecords.POST("/:id/evidences", tradingRead, handlers.CreateReceiptRecordEvidenceHandler)
		receiptRecords.DELETE("/:id/evidences/:evidenceId", tradingRead, handlers.DeleteReceiptRecordEvidenceHandler)
	}

	paymentRecords := authorized.Group("/payment-records")
	{
		paymentRecords.GET("/:id/evidences", tradingRead, handlers.GetPaymentRecordEvidencesHandler)
		paymentRecords.POST("/:id/evidences", tradingRead, handlers.CreatePaymentRecordEvidenceHandler)
		paymentRecords.DELETE("/:id/evidences/:evidenceId", tradingRead, handlers.DeletePaymentRecordEvidenceHandler)
	}
}

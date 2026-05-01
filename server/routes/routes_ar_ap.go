package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerArApRoutes(authorized *gin.RouterGroup) {
	tradingRead := middleware.RequirePermissions(authz.MenuTrading)
	purchaseRead := middleware.RequirePermissions(authz.MenuPurchase)

	receivables := authorized.Group("/receivables")
	{
		receivables.GET("", tradingRead, handlers.GetReceivableLedgersHandler)
		receivables.GET("/search", tradingRead, handlers.SearchReceivableLedgersHandler)
		receivables.GET("/:id", tradingRead, handlers.GetReceivableLedgerHandler)
		receivables.POST("/:id/receipts", tradingRead, handlers.CreateReceiptRecordHandler)
	}

	payables := authorized.Group("/payables")
	{
		payables.GET("", purchaseRead, handlers.GetPayableLedgersHandler)
		payables.GET("/search", purchaseRead, handlers.SearchPayableLedgersHandler)
		payables.GET("/:id", purchaseRead, handlers.GetPayableLedgerHandler)
		payables.POST("/:id/payments", purchaseRead, handlers.CreatePaymentRecordHandler)
	}
}

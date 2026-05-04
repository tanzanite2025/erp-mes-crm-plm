package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerFinanceRoutes(authorized *gin.RouterGroup) {
	adminOnly := middleware.RequirePermissions(authz.PermissionManage)
	settingsAccess := middleware.RequirePermissions(authz.MenuSettings, authz.MenuTrading)

	financeGroup := authorized.Group("/finance")
	financeGroup.Use(settingsAccess)
	{
		financeGroup.GET("/currencies", handlers.GetCurrencies)
		financeGroup.POST("/currencies", adminOnly, handlers.SaveCurrency)
		financeGroup.POST("/currencies/:id/set-base", adminOnly, handlers.SetBaseCurrency)
		financeGroup.GET("/currencies/sync-config", handlers.GetExchangeRateSyncConfigHandler)
		financeGroup.POST("/currencies/sync-config", adminOnly, handlers.SaveExchangeRateSyncConfigHandler)
		financeGroup.POST("/currencies/sync", adminOnly, handlers.SyncExchangeRatesWithLock)
		financeGroup.GET("/payment-methods", handlers.GetPaymentMethods)
		financeGroup.POST("/payment-methods", adminOnly, handlers.SavePaymentMethod)
		financeGroup.PATCH("/payment-methods/:id", adminOnly, handlers.PatchPaymentMethod)
		financeGroup.GET("/payment-terms", handlers.GetPaymentTerms)
		financeGroup.POST("/payment-terms", adminOnly, handlers.SavePaymentTerm)
		financeGroup.PATCH("/payment-terms/:id", adminOnly, handlers.PatchPaymentTerm)
		financeGroup.GET("/tax-rates", handlers.GetTaxRates)
		financeGroup.POST("/tax-rates", adminOnly, handlers.SaveTaxRate)
		financeGroup.POST("/seed", adminOnly, handlers.SeedFinanceData)
	}
}

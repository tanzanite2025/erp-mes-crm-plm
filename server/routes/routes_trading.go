package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerTradingRoutes(authorized *gin.RouterGroup) {
	tradingAccess := middleware.RequirePermissions(authz.MenuTrading)
	salesOrderManage := middleware.RequirePermissions(authz.ActionTradingSalesOrderManage)
	salesOrderDelete := middleware.RequirePermissions(authz.ActionTradingSalesOrderDelete)
	salesOrderSync := middleware.RequirePermissions(authz.ActionTradingSalesOrderSync)
	customerManage := middleware.RequirePermissions(authz.ActionTradingCustomerManage)
	customerDelete := middleware.RequirePermissions(authz.ActionTradingCustomerDelete)
	customerSync := middleware.RequirePermissions(authz.ActionTradingCustomerSync)
	supplierManage := middleware.RequirePermissions(authz.ActionTradingSupplierManage)
	supplierDelete := middleware.RequirePermissions(authz.ActionTradingSupplierDelete)
	supplierSync := middleware.RequirePermissions(authz.ActionTradingSupplierSync)
	purchaseOrderManage := middleware.RequirePermissions(authz.ActionTradingPurchaseOrderManage)
	purchaseOrderDelete := middleware.RequirePermissions(authz.ActionTradingPurchaseOrderDelete)

	salesGroup := authorized.Group("/sales-orders")
	salesGroup.Use(tradingAccess)
	salesGroup.GET("", handlers.GetSalesOrdersHandler)
	salesGroup.GET("/:id", handlers.GetSalesOrderHandler)
	salesGroup.GET("/by-no/:orderNo", handlers.GetSalesOrderByNoHandler)
	salesGroup.POST("", salesOrderManage, handlers.SaveSalesOrderHandler)
	salesGroup.PATCH("/:id", salesOrderManage, handlers.PatchSalesOrderHandler)
	salesGroup.DELETE("/:id", salesOrderDelete, handlers.DeleteSalesOrderHandler)
	salesGroup.POST("/sync", salesOrderSync, handlers.BulkSyncSalesOrdersHandler)

	customerGroup := authorized.Group("/customers")
	customerGroup.Use(tradingAccess)
	customerGroup.GET("", handlers.GetCustomersHandler)
	customerGroup.POST("", customerManage, handlers.SaveCustomerHandler)
	customerGroup.DELETE("/:id", customerDelete, handlers.DeleteCustomerHandler)
	customerGroup.POST("/sync", customerSync, handlers.BulkSyncCustomersHandler)

	supplierGroup := authorized.Group("/suppliers")
	supplierGroup.Use(tradingAccess)
	supplierGroup.GET("", handlers.GetSuppliersHandler)
	supplierGroup.POST("", supplierManage, handlers.SaveSupplierHandler)
	supplierGroup.PATCH("/:id", supplierManage, handlers.PatchSupplierHandler)
	supplierGroup.DELETE("/:id", supplierDelete, handlers.DeleteSupplierHandler)
	supplierGroup.POST("/sync", supplierSync, handlers.BulkSyncSuppliersHandler)

	purchaseGroup := authorized.Group("/purchase")
	purchaseGroup.Use(tradingAccess)
	purchaseGroup.GET("/orders", handlers.GetPurchaseOrdersHandler)
	purchaseGroup.GET("/deleted-orders", handlers.GetDeletedPurchaseOrdersHandler)
	purchaseGroup.GET("/orders/:id", handlers.GetPurchaseOrderHandler)
	purchaseGroup.POST("/orders", purchaseOrderManage, handlers.SavePurchaseOrderHandler)
	purchaseGroup.PATCH("/orders/:id", purchaseOrderManage, handlers.PatchPurchaseOrderHandler)
	purchaseGroup.POST("/orders/:id/confirm-receipt", purchaseOrderManage, handlers.ConfirmPurchaseReceiptHandler)
	purchaseGroup.DELETE("/orders/:id", purchaseOrderDelete, handlers.DeletePurchaseOrderHandler)
}

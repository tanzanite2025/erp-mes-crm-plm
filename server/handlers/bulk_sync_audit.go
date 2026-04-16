package handlers

import (
	"net/http"
	"xdfc-server/authz"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func enforceBulkSyncPermissions(c *gin.Context) bool {
	if middleware.HasAnyPermission(
		c,
		authz.PermissionManage,
		authz.ActionWarehouseSync,
		authz.ActionTradingSalesOrderSync,
		authz.ActionTradingCustomerSync,
		authz.ActionTradingSupplierSync,
		authz.ActionEquipmentMoldSync,
		authz.ActionEquipmentFurnaceSync,
	) {
		return true
	}

	c.JSON(http.StatusForbidden, gin.H{
		"error": "[SECURITY] Bulk sync requires explicit sync permissions",
	})
	return false
}

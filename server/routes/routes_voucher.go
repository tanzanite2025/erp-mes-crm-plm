package routes

import (
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
)

func registerVoucherRoutes(authorized *gin.RouterGroup) {
	voucherRead := middleware.RequirePermissions(authz.MenuTrading, authz.MenuSettings)

	vouchers := authorized.Group("/vouchers")
	{
		vouchers.GET("", voucherRead, handlers.GetFinancialVouchersHandler)
		vouchers.GET("/:id", voucherRead, handlers.GetFinancialVoucherHandler)
	}
}

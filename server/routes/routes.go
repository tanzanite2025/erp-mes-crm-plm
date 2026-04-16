package routes

import (
	"log"
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api/v1")
	registerPublicRoutes(api)

	authorized := api.Group("")
	authorized.Use(middleware.AuthMiddleware())
	{
		registerUserRoutes(authorized)
		registerBasicUnitRoutes(authorized)
		registerAuthzRoutes(authorized)
		registerTradingRoutes(authorized)
		registerInventoryRoutes(authorized)
		registerEquipmentRoutes(authorized)
		registerProductionRoutes(authorized)
		registerOrgRoutes(authorized)
		registerLeaveRoutes(authorized)
		registerFinanceRoutes(authorized)
		registerArApRoutes(authorized)
		registerSettlementEvidenceRoutes(authorized)
		registerVoucherRoutes(authorized)
		registerApprovalRoutes(authorized)
		registerWorkflowRoutes(authorized)
		registerPersonalWorkbenchRoutes(authorized)

		adminOnly := middleware.RequirePermissions(authz.PermissionManage)
		engineeringAccess := middleware.RequirePermissions(authz.MenuEngineering)
		qualityAccess := middleware.RequirePermissions(authz.MenuQuality)
		pieceworkAccess := middleware.RequirePermissions(authz.MenuPiecework)
		printAccess := middleware.RequirePermissions(authz.MenuSettings)
		tradingAccess := middleware.RequirePermissions(authz.MenuTrading)
		tradingLogisticsManage := middleware.RequirePermissions(authz.ActionTradingLogisticsManage)
		tradingLogisticsStatus := middleware.RequirePermissions(authz.ActionTradingLogisticsStatusUpdate)
		tradingLogisticsDelete := middleware.RequirePermissions(authz.ActionTradingLogisticsDelete)
		tradingProviderManage := middleware.RequirePermissions(authz.ActionTradingLogisticsProviderManage)
		materialUpdate := middleware.RequirePermissions(authz.ActionMaterialUpdate)
		labCategoryCreate := middleware.RequirePermissions(authz.ActionLabExperimentalCategoryCreate)
		labCategoryDelete := middleware.RequirePermissions(authz.ActionLabExperimentalCategoryDelete)

		authorized.GET("/auth/snapshot", handlers.GetAuthSnapshotHandler)
		authorized.GET("/dashboard/stats", middleware.RequirePermissions(authz.MenuDashboard), handlers.GetDashboardStatsHandler)
		authorized.GET("/audit/timeline", handlers.GetDataTimelineHandler)
		authorized.GET("/audit/engine/stats", handlers.GetAuditEngineStatsHandler)
		authorized.POST("/assets/upload", handlers.UploadAssetHandler)
		authorized.POST("/ai/proxy", middleware.AIPolicyGuard(), middleware.AIProxyIngressGuard(), handlers.AiProxyHandler)

		materialGroup := authorized.Group("/materials")
		materialGroup.Use(middleware.RequirePermissions(authz.MenuEngineering, authz.MenuTrading, authz.MenuWarehouse))
		{
			materialGroup.GET("", handlers.GetMaterialsHandler)
			materialGroup.POST("", adminOnly, handlers.SaveMaterialHandler)
			materialGroup.PATCH("/:id", materialUpdate, handlers.PatchMaterialHandler)
			materialGroup.DELETE("/:id", adminOnly, handlers.DeleteMaterialHandler)
			materialGroup.POST("/sync", adminOnly, handlers.BulkSyncMaterialsHandler)
		}

		engineeringGroup := authorized.Group("/engineering")
		engineeringGroup.Use(engineeringAccess)
		{
			engineeringGroup.GET("/products/next-code", handlers.GetNextProductCodeHandler)
			engineeringGroup.GET("/products", handlers.GetProductsHandler)
			engineeringGroup.GET("/products/:id", handlers.GetProductHandler)
			engineeringGroup.POST("/products", adminOnly, handlers.SaveProductHandler)
			engineeringGroup.PATCH("/products/:id", adminOnly, handlers.PatchProductHandler)
			engineeringGroup.DELETE("/products/:id", adminOnly, handlers.DeleteProductHandler)
			engineeringGroup.POST("/products/sync", adminOnly, handlers.BulkSyncProductsHandler)
			engineeringGroup.GET("/bom", handlers.GetBOMsHandler)
			engineeringGroup.POST("/bom", adminOnly, handlers.SaveBOMHandler)
			engineeringGroup.DELETE("/bom/:id", adminOnly, handlers.DeleteBOMHandler)
			engineeringGroup.GET("/change-orders", handlers.GetChangeOrdersHandler)
			engineeringGroup.POST("/change-orders", adminOnly, handlers.SaveChangeOrderHandler)
			engineeringGroup.DELETE("/change-orders/:id", adminOnly, handlers.DeleteChangeOrderHandler)

			templateGroup := engineeringGroup.Group("/templates")
			{
				templateGroup.GET("", handlers.GetProductTemplatesHandler)
				templateGroup.POST("", adminOnly, handlers.SaveProductTemplateHandler)
				templateGroup.PATCH("/:id", adminOnly, handlers.PatchProductTemplateHandler)
				templateGroup.DELETE("/:id", adminOnly, handlers.DeleteProductTemplateHandler)
				templateGroup.POST("/sync", adminOnly, handlers.SyncProductTemplatesHandler)
			}

			engineeringGroup.GET("/product-types", handlers.GetProductTypesHandler)
			engineeringGroup.GET("/product-types/template-resolution", handlers.GetProductTypeTemplateResolutionHandler)
			engineeringGroup.POST("/product-types", adminOnly, handlers.SaveProductTypeHandler)
			engineeringGroup.PATCH("/product-types/:id", adminOnly, handlers.PatchProductTypeHandler)
			engineeringGroup.DELETE("/product-types/:id", adminOnly, handlers.DeleteProductTypeHandler)
			engineeringGroup.POST("/product-types/sync", adminOnly, handlers.SyncProductTypesHandler)
			engineeringGroup.GET("/product-type-attribute-bindings", handlers.GetProductTypeAttributeBindingsHandler)
			engineeringGroup.POST("/product-type-attribute-bindings", adminOnly, handlers.SaveProductTypeAttributeBindingHandler)
			engineeringGroup.PATCH("/product-type-attribute-bindings/:id", adminOnly, handlers.PatchProductTypeAttributeBindingHandler)
			engineeringGroup.POST("/product-type-attribute-bindings/sync", adminOnly, handlers.SyncProductTypeAttributeBindingsHandler)
			engineeringGroup.DELETE("/product-type-attribute-bindings/:id", adminOnly, handlers.DeleteProductTypeAttributeBindingHandler)
			engineeringGroup.GET("/product-attribute-categories", handlers.GetProductAttributeCategoriesHandler)
			engineeringGroup.POST("/product-attribute-categories", adminOnly, handlers.SaveProductAttributeCategoryHandler)
			engineeringGroup.DELETE("/product-attribute-categories/:id", adminOnly, handlers.DeleteProductAttributeCategoryHandler)
			engineeringGroup.GET("/product-attribute-options", handlers.GetProductAttributeOptionsHandler)
			engineeringGroup.POST("/product-attribute-options", adminOnly, handlers.SaveProductAttributeOptionHandler)
			engineeringGroup.DELETE("/product-attribute-options/:id", adminOnly, handlers.DeleteProductAttributeOptionHandler)
			engineeringGroup.GET("/specs", handlers.GetEngineeringSpecsHandler)
			engineeringGroup.GET("/specs/:id", handlers.GetEngineeringSpecHandler)
			engineeringGroup.POST("/specs", adminOnly, handlers.SaveEngineeringSpecHandler)
			engineeringGroup.POST("/specs/sync", adminOnly, handlers.BulkSyncEngineeringSpecsHandler)
			engineeringGroup.DELETE("/specs/:id", adminOnly, handlers.DeleteEngineeringSpecHandler)
		}

		logisticsGroup := authorized.Group("/logistics")
		logisticsGroup.Use(tradingAccess)
		{
			logisticsGroup.GET("", handlers.GetLogisticsRecordsHandler)
			logisticsGroup.GET("/:id", handlers.GetLogisticsRecordHandler)
			logisticsGroup.POST("", tradingLogisticsManage, handlers.SaveLogisticsRecordHandler)
			logisticsGroup.PATCH("/:id/status", tradingLogisticsStatus, handlers.UpdateLogisticsStatusHandler)
			logisticsGroup.DELETE("/:id", tradingLogisticsDelete, handlers.DeleteLogisticsRecordHandler)
		}

		logisticsConfigGroup := authorized.Group("/logistics-config")
		logisticsConfigGroup.Use(middleware.RequirePermissions(authz.MenuSettings, authz.MenuTrading))
		{
			logisticsConfigGroup.GET("/vehicle-specs", handlers.GetVehicleSpecsCatalogHandler)
			logisticsConfigGroup.POST("/vehicle-specs/:id/photos", handlers.SaveVehicleSpecPhotoHandler)
		}

		vehicleLoadingGroup := authorized.Group("/logistics/vehicle-loading")
		vehicleLoadingGroup.Use(middleware.RequirePermissions(authz.MenuSettings, authz.MenuTrading))
		{
			vehicleLoadingGroup.POST("/recommendations", handlers.GetVehicleLoadingRecommendationsHandler)
		}

		shippingManagementGroup := authorized.Group("/shipping-management")
		shippingManagementGroup.Use(middleware.RequirePermissions(authz.MenuTrading, authz.MenuSettings))
		{
			shippingManagementGroup.GET("/vehicle-match-items", handlers.GetShippingVehicleMatchItemsHandler)
			shippingManagementGroup.GET("/vehicle-contacts", handlers.GetVehicleContactBindingsHandler)
			shippingManagementGroup.GET("/vehicle-contacts/:id", handlers.GetVehicleContactBindingHandler)
			shippingManagementGroup.POST("/vehicle-contacts/:id", handlers.SaveVehicleContactBindingHandler)
			shippingManagementGroup.DELETE("/vehicle-contacts/:id", handlers.DeleteVehicleContactBindingHandler)
		}

		logisticsPush := authorized.Group("/logistics-push")
		logisticsPush.Use(tradingAccess)
		{
			logisticsPush.GET("/providers", handlers.GetLogisticsProvidersHandler)
			logisticsPush.POST("/providers", tradingProviderManage, handlers.SaveLogisticsProviderHandler)
			logisticsPush.DELETE("/providers/:id", tradingProviderManage, handlers.DeleteLogisticsProviderHandler)
			logisticsPush.GET("/orders", handlers.GetDeliveryOrdersHandler)
			logisticsPush.GET("/tracking/:trackingNo", handlers.GetDeliveryTrackingHandler)
			logisticsPush.POST("/callback", handlers.HandlePushCallbackHandler)
		}

		packagingGroup := authorized.Group("/packaging")
		packagingGroup.Use(middleware.RequirePermissions(authz.MenuEngineering, authz.MenuTrading))
		{
			packagingGroup.GET("", handlers.GetPackagingRulesHandler)
			packagingGroup.POST("", adminOnly, handlers.SavePackagingRuleHandler)
			packagingGroup.DELETE("/:id", adminOnly, handlers.DeletePackagingRuleHandler)
			packagingGroup.GET("/profiles", handlers.GetPackagingProfilesHandler)
			packagingGroup.POST("/profiles", adminOnly, handlers.SavePackagingProfileHandler)
			packagingGroup.DELETE("/profiles/:id", adminOnly, handlers.DeletePackagingProfileHandler)
		}

		pdaGroup := authorized.Group("/pda")
		pdaGroup.Use(middleware.RequirePermissions(authz.MenuPDA))
		{
			pdaGroup.POST("/ingest", handlers.PDAIngestScanHandler)
			pdaGroup.POST("/scan", handlers.PDASubmitScanHandler)
			pdaGroup.POST("/sync", handlers.PDASyncResultsHandler)
		}

		traceGroup := authorized.Group("/trace")
		traceGroup.Use(middleware.RequirePermissions(authz.MenuTrading, authz.MenuProdConfig, authz.MenuQuality, authz.MenuWarehouse, authz.MenuSettings))
		{
			traceGroup.POST("/wheel/lookup", handlers.LookupWheelTraceHandler)
		}

		statusGroup := authorized.Group("/system/status")
		{
			statusGroup.GET("", middleware.RequirePermissions(authz.MenuSystem), handlers.SystemStatusHandler)
			statusGroup.GET("/alerts/active", middleware.RequirePermissions(authz.MenuSystem), handlers.GetActiveAlertsHandler)
			statusGroup.GET("/alerts/diagnostic", middleware.RequirePermissions(authz.MenuSystem), handlers.GetAlertDiagnosticsHandler)
		}

		// --- 企业配置 (Enterprise Config) ---
		authorized.GET("/enterprise/config", middleware.RequirePermissions(authz.MenuSettings), handlers.GetEnterpriseConfigHandler)
		authorized.POST("/enterprise/config", middleware.RequirePermissions(authz.MenuSettings), handlers.SaveEnterpriseConfigHandler)

		// --- 工作流引擎路由 (Workflow Routing) ---
		routingGroup := authorized.Group("/system/routing")
		{
			routingGroup.GET("/commands", middleware.RequirePermissions(authz.MenuSystem), handlers.GetCommandsHandler)
			routingGroup.POST("/commands", adminOnly, handlers.SaveCommandHandler)
			routingGroup.PUT("/commands/:id", adminOnly, handlers.UpdateCommandHandler)
			routingGroup.DELETE("/commands/:id", adminOnly, handlers.DeleteCommandHandler)

			routingGroup.GET("/rules", middleware.RequirePermissions(authz.MenuSystem), handlers.GetRulesHandler)
			routingGroup.POST("/rules", adminOnly, handlers.SaveRuleHandler)
			routingGroup.PUT("/rules/:id", adminOnly, handlers.UpdateRuleHandler)
			routingGroup.DELETE("/rules/:id", adminOnly, handlers.DeleteRuleHandler)
		}

		printGroup := authorized.Group("/print-batches")
		printGroup.Use(printAccess)
		{
			printGroup.GET("", handlers.GetPrintBatchesHandler)
			printGroup.POST("", handlers.SavePrintBatchHandler)
			printGroup.POST("/atomic-print", handlers.AtomicPrintHandler)
			printGroup.POST("/:id/activate", handlers.ActivateBatchHandler)
			printGroup.POST("/:id/scrap", handlers.ScrapBatchHandler)
			printGroup.GET("/next-sequence", handlers.GetNextSequenceHandler)
		}

		numberingGroup := authorized.Group("/numbering")
		{
			numberingGroup.GET("/generate", handlers.GenerateNextNumberHandler)
			numberingGroup.GET("/rules", middleware.RequirePermissions(authz.MenuSettings), handlers.GetNumberingRulesHandler)
			numberingGroup.POST("/rules", adminOnly, handlers.SaveNumberingRuleHandler)
		}

		linearBarcodeProtocolGroup := authorized.Group("/protocols/linear-barcode")
		linearBarcodeProtocolGroup.Use(middleware.RequirePermissions(authz.MenuSettings))
		{
			linearBarcodeProtocolGroup.GET("", handlers.GetLinearBarcodeProtocolConfigHandler)
			linearBarcodeProtocolGroup.POST("", adminOnly, handlers.UpdateLinearBarcodeProtocolConfigHandler)
		}

		quality := authorized.Group("/quality")
		quality.Use(qualityAccess)
		{
			quality.GET("/standards", handlers.GetInspectionStandardsHandler)
			quality.POST("/standards", adminOnly, handlers.SaveInspectionStandardHandler)
			quality.GET("/tasks", handlers.GetInspectionTasksHandler)
			quality.POST("/tasks", handlers.SaveInspectionTaskHandler)
			quality.GET("/abnormalities", handlers.GetAbnormalitiesHandler)
		}

		piecework := authorized.Group("/piecework")
		piecework.Use(pieceworkAccess)
		{
			piecework.GET("/teams", handlers.GetTeamsHandler)
			piecework.POST("/teams", adminOnly, handlers.SaveTeamHandler)
			piecework.DELETE("/teams/:id", adminOnly, handlers.DeleteTeamHandler)
			piecework.GET("/rates", handlers.GetPieceworkRatesHandler)
			piecework.POST("/rates", adminOnly, handlers.SavePieceworkRateHandler)
		}

		labExpGroup := authorized.Group("/labs/experimental")
		labExpGroup.Use(qualityAccess)
		{
			labExpGroup.GET("/categories", handlers.GetExpCategoriesHandler)
			labExpGroup.POST("/categories", labCategoryCreate, handlers.SaveExpCategoryHandler)
			labExpGroup.DELETE("/categories/:id", labCategoryDelete, handlers.DeleteExpCategoryHandler)
			labExpGroup.GET("/equipment", handlers.GetExpEquipmentHandler)
			labExpGroup.POST("/equipment", handlers.SaveExpEquipmentHandler)
			labExpGroup.GET("/tasks", handlers.GetExpTasksHandler)
			labExpGroup.POST("/tasks", handlers.SaveExpTaskHandler)
			labExpGroup.GET("/reports", handlers.GetExpReportsHandler)
			labExpGroup.POST("/reports", handlers.SaveExpReportHandler)
		}
	}
}

func registerPublicRoutes(api *gin.RouterGroup) {
	api.GET("/health", handlers.HealthHandler)
	api.POST("/auth/login", middleware.LoginRateLimitMiddleware(), handlers.LoginHandler)
	api.GET("/ws", func(c *gin.Context) {
		log.Printf("[WS_TRACE] Incoming request: Remote=%s, Host=%s, Upgrade=%s", c.Request.RemoteAddr, c.Request.Host, c.Request.Header.Get("Upgrade"))
		handlers.WSHandler(c)
	})
	system := api.Group("/system")
	{
		system.GET("/metrics", gin.WrapH(promhttp.Handler()))
		system.POST("/alerts/webhook", middleware.AlertWebhookIngressGuard(), handlers.AlertWebhookHandler)
	}
}

func registerUserRoutes(authorized *gin.RouterGroup) {
	authorized.GET("/users", middleware.RequirePermissions(authz.MenuOrg, authz.PermissionUserView), handlers.GetUsersHandler)
	authorized.GET("/users/:id/access", middleware.RequirePermissions(authz.MenuOrg, authz.PermissionUserView), handlers.GetUserAccessSnapshotHandler)
	authorized.GET("/users/:id/roles", middleware.RequirePermissions(authz.MenuOrg, authz.PermissionUserView), handlers.GetUserRoleBindingsHandler)
	authorized.POST("/users/:id/roles", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.AddUserRoleBindingHandler)
	authorized.DELETE("/users/:id/roles/:roleId", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.RemoveUserRoleBindingHandler)
	authorized.POST("/users/:id/bind-employee", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.BindUserEmployeeHandler)
	authorized.POST("/users/:id/unbind-employee", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.UnbindUserEmployeeHandler)
	authorized.POST("/users", middleware.RequirePermissions(authz.PermissionUserCreate), handlers.CreateUserHandler)
	authorized.PATCH("/users/:id", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.PatchUserHandler)
	authorized.PATCH("/users/:id/primary-role", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.SetUserPrimaryRoleHandler)
	authorized.PUT("/users/:id", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.ReplaceUserHandler)
	authorized.DELETE("/users/:id", middleware.RequirePermissions(authz.PermissionUserDelete), handlers.DeleteUserHandler)
	authorized.POST("/users/sync", middleware.RequirePermissions(authz.PermissionManage), handlers.BulkSyncUsersHandler)
}

func registerBasicUnitRoutes(authorized *gin.RouterGroup) {
	unitGroup := authorized.Group("/basic/units")
	unitGroup.Use(middleware.RequirePermissions(authz.MenuSettings, authz.MenuEngineering, authz.MenuTrading))
	unitGroup.GET("", handlers.GetUnitsHandler)
	unitGroup.POST("", middleware.RequirePermissions(authz.PermissionManage), handlers.SaveUnitHandler)
	unitGroup.POST("/sync", middleware.RequirePermissions(authz.PermissionManage), handlers.BulkSyncUnitsHandler)
	unitGroup.DELETE("/:id", middleware.RequirePermissions(authz.PermissionManage), handlers.DeleteUnitHandler)
}

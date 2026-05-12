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
		registerAuthzRoutes(authorized)
		registerBasicUnitRoutes(authorized)
		registerKnowledgeBaseRoutes(authorized)
		registerSystemConfigRoutes(authorized)
		registerTradingRoutes(authorized)
		registerInventoryRoutes(authorized)
		registerEquipmentRoutes(authorized)
		registerProductionRoutes(authorized)
		registerCuttingOperationRoutes(authorized)
		registerOrgRoutes(authorized)
		registerLeaveRoutes(authorized)
		registerFinanceRoutes(authorized)
		registerArApRoutes(authorized)
		registerSettlementEvidenceRoutes(authorized)
		registerVoucherRoutes(authorized)
		registerApprovalRoutes(authorized)
		registerPersonalWorkbenchRoutes(authorized)
		registerSidebarCommandRoutes(authorized)
		registerApsSchedulingRoutes(authorized)

		adminOnly := middleware.RequirePermissions(authz.PermissionManage)
		engineeringAccess := middleware.RequirePermissions(authz.MenuEngineering)
		qualityAccess := middleware.RequirePermissions(authz.MenuQuality)
		pieceworkAccess := middleware.RequirePermissions(authz.MenuPiecework)
		printAccess := middleware.RequirePermissions(authz.MenuSettings)
		tradingAccess := middleware.RequirePermissions(authz.MenuTrading)
		tradingOrPurchaseAccess := middleware.RequirePermissions(authz.MenuTrading, authz.MenuPurchase)
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
		authorized.GET("/audit/engine/stats", middleware.RequirePermissions(authz.MenuSystem), handlers.GetAuditEngineStatsHandler)
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

		rawMaterialGroup := authorized.Group("/raw-materials")
		rawMaterialGroup.Use(middleware.RequirePermissions(authz.MenuTrading, authz.MenuWarehouse, authz.MenuEngineering))
		{
			rawMaterialGroup.POST("/prepreg-label-ocr-sessions", handlers.CreatePrepregLabelOcrSessionHandler)
			rawMaterialGroup.GET("/prepreg-label-ocr-sessions/:sessionId", handlers.GetPrepregLabelOcrSessionHandler)
			rawMaterialGroup.GET("/prepreg-specs", handlers.GetPrepregMaterialSpecsHandler)
			rawMaterialGroup.GET("/prepreg-specs/:id", handlers.GetPrepregMaterialSpecByIDHandler)
			rawMaterialGroup.POST("/prepreg-specs", adminOnly, handlers.SavePrepregMaterialSpecHandler)
			rawMaterialGroup.DELETE("/prepreg-specs/:id", adminOnly, handlers.DeletePrepregMaterialSpecHandler)
			rawMaterialGroup.POST("/prepreg-binding-tokens/batch", handlers.CreatePrepregBindingTokenBatchHandler)
			rawMaterialGroup.GET("/prepreg-binding-tokens/:token", handlers.GetPrepregBindingTokenStateHandler)
			rawMaterialGroup.POST("/prepreg-binding-tokens/:token/bind", adminOnly, handlers.BindPrepregBindingTokenToSpecHandler)
			rawMaterialGroup.POST("/batch-optimizer/solve", handlers.SolveRawMaterialBatchOptimizerHandler)
		}

		appearanceGroup := authorized.Group("/engineering/product-appearances")
		appearanceGroup.Use(middleware.RequirePermissions(authz.MenuEngineering, authz.MenuTrading))
		{
			appearanceGroup.GET("", handlers.GetProductAppearancesHandler)
			appearanceGroup.POST("", adminOnly, handlers.SaveProductAppearanceHandler)
			appearanceGroup.PATCH("/:id", adminOnly, handlers.PatchProductAppearanceHandler)
			appearanceGroup.DELETE("/:id", adminOnly, handlers.DeleteProductAppearanceHandler)
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
			engineeringGroup.GET("/bom", handlers.GetBOMsHandler)
			engineeringGroup.GET("/bom/version-history", handlers.ListBOMVersionHistoryHandler)
			engineeringGroup.GET("/bom/version-history/:id", handlers.GetBOMVersionHistoryEntryHandler)
			engineeringGroup.GET("/bom/:id", handlers.GetBOMHandler)
			engineeringGroup.POST("/bom", adminOnly, handlers.SaveBOMHandler)
			engineeringGroup.POST("/bom/:id/promote", adminOnly, handlers.PromoteBOMStatusHandler)
			engineeringGroup.POST("/bom/:id/derive-mbom", adminOnly, handlers.DeriveMBOMFromEBOMHandler)
			engineeringGroup.DELETE("/bom/:id", adminOnly, handlers.DeleteBOMHandler)
			engineeringGroup.GET("/bom-sections", handlers.GetBOMSectionsHandler)
			engineeringGroup.GET("/bom-sections/options", handlers.GetBOMSectionOptionsHandler)
			engineeringGroup.POST("/bom-sections", adminOnly, handlers.SaveBOMSectionHandler)
			engineeringGroup.PATCH("/bom-sections/:id", adminOnly, handlers.PatchBOMSectionHandler)
			engineeringGroup.DELETE("/bom-sections/:id", adminOnly, handlers.DeleteBOMSectionHandler)

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
			engineeringGroup.GET("/product-attribute-categories", handlers.GetProductAttributeCategoriesHandler)
			engineeringGroup.POST("/product-attribute-categories", adminOnly, handlers.SaveProductAttributeCategoryHandler)
			engineeringGroup.POST("/product-attribute-categories/reorder", adminOnly, handlers.ReorderProductAttributeCategoriesHandler)
			engineeringGroup.DELETE("/product-attribute-categories/:id", adminOnly, handlers.DeleteProductAttributeCategoryHandler)
			engineeringGroup.GET("/product-attribute-options", handlers.GetProductAttributeOptionsHandler)
			engineeringGroup.POST("/product-attribute-options", adminOnly, handlers.SaveProductAttributeOptionHandler)
			engineeringGroup.POST("/product-attribute-options/reorder", adminOnly, handlers.ReorderProductAttributeOptionsHandler)
			engineeringGroup.DELETE("/product-attribute-options/:id", adminOnly, handlers.DeleteProductAttributeOptionHandler)
			engineeringGroup.GET("/specs", handlers.GetEngineeringSpecsHandler)
			engineeringGroup.GET("/specs/:id", handlers.GetEngineeringSpecHandler)
			engineeringGroup.POST("/specs", adminOnly, handlers.SaveEngineeringSpecHandler)
			engineeringGroup.PATCH("/specs/:id", adminOnly, handlers.PatchEngineeringSpecHandler)
			engineeringGroup.POST("/specs/sync", adminOnly, handlers.BulkSyncEngineeringSpecsHandler)
			engineeringGroup.DELETE("/specs/:id", adminOnly, handlers.DeleteEngineeringSpecHandler)
		}

		logisticsGroup := authorized.Group("/logistics")
		logisticsGroup.Use(tradingOrPurchaseAccess)
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
			logisticsPush.POST("/providers/:id/verify", tradingProviderManage, handlers.VerifyLogisticsProviderHandler)
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
		authorized.POST("/enterprise/config", adminOnly, handlers.SaveEnterpriseConfigHandler)

		// --- 工作流引擎路由 (Workflow Routing) ---
		routingGroup := authorized.Group("/system/routing")
		{
			routingGroup.GET("/event-source-phase-catalog", middleware.RequirePermissions(authz.MenuSystem), handlers.GetBusinessEventPhaseCatalogHandler)
			routingGroup.GET("/event-sources", middleware.RequirePermissions(authz.MenuSystem), handlers.GetBusinessEventSourcesHandler)
			routingGroup.POST("/event-sources", adminOnly, handlers.SaveBusinessEventSourceHandler)
			routingGroup.POST("/event-sources/:id/status-rename-transaction", adminOnly, handlers.CommitBusinessEventStatusRenameTransactionHandler)
			routingGroup.PUT("/event-sources/:id", adminOnly, handlers.UpdateBusinessEventSourceHandler)
			routingGroup.DELETE("/event-sources/:id", adminOnly, handlers.DeleteBusinessEventSourceHandler)

			routingGroup.GET("/commands", middleware.RequirePermissions(authz.MenuSystem), handlers.GetCommandsHandler)
			routingGroup.POST("/commands", adminOnly, handlers.SaveCommandHandler)
			routingGroup.PUT("/commands/:id", adminOnly, handlers.UpdateCommandHandler)
			routingGroup.DELETE("/commands/:id", adminOnly, handlers.DeleteCommandHandler)

			routingGroup.GET("/rules", middleware.RequirePermissions(authz.MenuSystem), handlers.GetRulesHandler)
			routingGroup.POST("/rules", adminOnly, handlers.SaveRuleHandler)
			routingGroup.PUT("/rules/:id", adminOnly, handlers.UpdateRuleHandler)
			routingGroup.DELETE("/rules/:id", adminOnly, handlers.DeleteRuleHandler)

			routingGroup.GET("/execution-logs", middleware.RequirePermissions(authz.MenuSystem), handlers.GetRuleExecutionLogsHandler)
			routingGroup.POST("/execution-logs", handlers.SaveRuleExecutionLogHandler)
		}

		printGroup := authorized.Group("/print-batches")
		printGroup.Use(printAccess)
		{
			printGroup.GET("", handlers.GetPrintBatchesHandler)
			printGroup.POST("", handlers.SavePrintBatchHandler)
			printGroup.POST("/atomic-print", handlers.AtomicPrintHandler)
			printGroup.POST("/:id/activate", handlers.ActivateBatchHandler)
			printGroup.POST("/:id/scrap", handlers.ScrapBatchHandler)
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
			quality.GET("/standards/:id", handlers.GetInspectionStandardByIDHandler)
			quality.PATCH("/standards/:id", adminOnly, handlers.PatchInspectionStandardHandler)
			quality.POST("/standards", adminOnly, handlers.SaveInspectionStandardHandler)
			quality.GET("/tasks", handlers.GetInspectionTasksHandler)
			quality.POST("/tasks", handlers.SaveInspectionTaskHandler)
			quality.GET("/stats", handlers.GetInspectionStatsHandler)
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
	api.POST("/raw-materials/prepreg-label-ocr-sessions/:sessionId/submit", handlers.SubmitPrepregLabelOcrSessionHandler)
	api.POST("/production/product-barcode-capture-sessions/:sessionId/submit", handlers.SubmitProductBarcodeCaptureSessionHandler)
	api.POST("/warehouse/packaging-assemblies/capture-sessions/:sessionId/submit", handlers.SubmitPackagingAssemblyCaptureSessionHandler)
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
	authorized.GET("/users/:id/permissions", middleware.RequirePermissions(authz.MenuOrg, authz.PermissionUserView), handlers.GetUserPermissionsHandler)
	authorized.PUT("/users/:id/permissions", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.ReplaceUserPermissionsHandler)
	authorized.POST("/users/:id/bind-employee", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.BindUserEmployeeHandler)
	authorized.POST("/users/:id/unbind-employee", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.UnbindUserEmployeeHandler)
	authorized.POST("/users", middleware.RequirePermissions(authz.PermissionUserCreate), handlers.CreateUserHandler)
	authorized.PATCH("/users/:id", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.PatchUserHandler)
	authorized.PUT("/users/:id", middleware.RequirePermissions(authz.PermissionUserEdit), handlers.ReplaceUserHandler)
	authorized.DELETE("/users/:id", middleware.RequirePermissions(authz.PermissionUserDelete), handlers.DeleteUserHandler)
	authorized.POST("/users/sync", middleware.RequirePermissions(authz.PermissionManage), handlers.BulkSyncUsersHandler)
}

func registerBasicUnitRoutes(authorized *gin.RouterGroup) {
	unitGroup := authorized.Group("/basic/units")
	unitGroup.Use(middleware.RequirePermissions(authz.MenuSettings, authz.MenuEngineering, authz.MenuTrading))
	unitGroup.GET("", handlers.GetUnitsHandler)
	unitGroup.POST("", middleware.RequirePermissions(authz.PermissionManage), handlers.SaveUnitHandler)
	unitGroup.PATCH("/:id", middleware.RequirePermissions(authz.PermissionManage), handlers.PatchUnitHandler)
	unitGroup.POST("/sync", middleware.RequirePermissions(authz.PermissionManage), handlers.BulkSyncUnitsHandler)
	unitGroup.DELETE("/:id", middleware.RequirePermissions(authz.PermissionManage), handlers.DeleteUnitHandler)
}

func registerKnowledgeBaseRoutes(authorized *gin.RouterGroup) {
	knowledgeGroup := authorized.Group("/knowledge-base")
	knowledgeGroup.GET("/entries/search", handlers.SearchKnowledgeBaseEntriesHandler)
	knowledgeGroup.GET("/entries", middleware.RequirePermissions(authz.MenuSettings), handlers.GetKnowledgeBaseEntriesHandler)
	knowledgeGroup.POST("/entries", middleware.RequirePermissions(authz.PermissionManage), handlers.CreateKnowledgeBaseEntryHandler)
	knowledgeGroup.PUT("/entries/:id", middleware.RequirePermissions(authz.PermissionManage), handlers.UpdateKnowledgeBaseEntryHandler)
	knowledgeGroup.POST("/entries/:id/view", handlers.RecordKnowledgeBaseEntryViewHandler)
	knowledgeGroup.DELETE("/entries/:id", middleware.RequirePermissions(authz.PermissionManage), handlers.DeleteKnowledgeBaseEntryHandler)
}

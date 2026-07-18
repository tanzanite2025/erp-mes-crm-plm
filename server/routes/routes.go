package routes

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
	"xdfc-server/authz"
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"golang.org/x/time/rate"
)

// getRateLimitConfig 从环境变量读取限流配置
func getRateLimitConfig(key string, defaultValue int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func SetupRoutes(r *gin.Engine) {
	// ========== Rate Limiting 配置 ==========
	// 从环境变量读取配置,如果未设置则使用默认值
	globalRPS := getRateLimitConfig("RATE_LIMIT_GLOBAL_RPS", 20)
	globalBurst := getRateLimitConfig("RATE_LIMIT_GLOBAL_BURST", 40)
	writeRPS := getRateLimitConfig("RATE_LIMIT_WRITE_RPS", 5)
	writeBurst := getRateLimitConfig("RATE_LIMIT_WRITE_BURST", 10)

	// 创建全局限流器: 防止 DoS 攻击
	globalLimiter := middleware.NewRateLimiter(rate.Limit(globalRPS), globalBurst)
	globalLimiter.CleanupVisitors(5 * time.Minute)

	// 创建写操作限流器: 防止数据滥用
	writeLimiter := middleware.NewRateLimiter(rate.Limit(writeRPS), writeBurst)
	writeLimiter.CleanupVisitors(5 * time.Minute)

	// 应用全局限流到所有路由
	r.Use(globalLimiter.Middleware())
	r.GET("/uploads/*filepath", middleware.AuthMiddleware(), handlers.ServeUploadedAssetHandler)
	// ========================================

	api := r.Group("/api/v1")
	registerPublicRoutes(api)

	authorized := api.Group("")
	authorized.Use(middleware.AuthMiddleware())
	{
		// 应用写操作限流和 CSRF 保护
		csrfProtection := middleware.CSRFProtection()
		authorized.Use(func(c *gin.Context) {
			method := c.Request.Method
			// 对写操作应用更严格的限流和 CSRF 保护
			if method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE" {
				if !writeLimiter.Allow(c.ClientIP()) {
					c.JSON(http.StatusTooManyRequests, gin.H{
						"error": "[RATE_LIMIT] 请求过于频繁,请稍后重试",
					})
					c.Abort()
					return
				}
				csrfProtection(c)
				return
			}
			c.Next()
		})

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

		adminOnly := middleware.RequireAnyPermission(authz.PermissionManage)
		engineeringAccess := middleware.RequireAnyPermission(authz.MenuEngineering)
		qualityAccess := middleware.RequireAnyPermission(authz.MenuQuality)
		pieceworkAccess := middleware.RequireAnyPermission(authz.MenuPiecework)
		printAccess := middleware.RequireAnyPermission(authz.MenuSettings)
		tradingAccess := middleware.RequireAnyPermission(authz.MenuTrading)
		tradingOrPurchaseAccess := middleware.RequireAnyPermission(authz.MenuTrading, authz.MenuPurchase)
		tradingLogisticsManage := middleware.RequireAnyPermission(authz.ActionTradingLogisticsManage)
		tradingLogisticsStatus := middleware.RequireAnyPermission(authz.ActionTradingLogisticsStatusUpdate)
		tradingLogisticsDelete := middleware.RequireAnyPermission(authz.ActionTradingLogisticsDelete)
		tradingProviderManage := middleware.RequireAnyPermission(authz.ActionTradingLogisticsProviderManage)
		materialUpdate := middleware.RequireAnyPermission(authz.ActionMaterialUpdate)
		labCategoryCreate := middleware.RequireAnyPermission(authz.ActionLabExperimentalCategoryCreate)
		labCategoryDelete := middleware.RequireAnyPermission(authz.ActionLabExperimentalCategoryDelete)
		bomManage := middleware.RequireAnyPermission(authz.ActionEngineeringBOMManage)
		bomPromote := middleware.RequireAnyPermission(authz.ActionEngineeringBOMPromote)
		assetUploadAccess := middleware.RequireAnyPermission(
			authz.MenuEquipment,
			authz.MenuEngineering,
			authz.MenuTrading,
			authz.MenuWarehouse,
			authz.MenuPDA,
			authz.PermissionManage,
		)

		authorized.GET("/auth/snapshot", handlers.GetAuthSnapshotHandler)
		authorized.POST("/auth/ws-ticket", handlers.CreateWSTicketHandler)
		authorized.GET("/search/global", handlers.GlobalSearchHandler)
		authorized.GET("/dashboard/stats", middleware.RequireAnyPermission(authz.MenuDashboard), handlers.GetDashboardStatsHandler)
		authorized.GET("/audit/timeline", handlers.GetDataTimelineHandler)
		authorized.GET("/audit/engine/stats", middleware.RequireAnyPermission(authz.MenuSystem), handlers.GetAuditEngineStatsHandler)
		authorized.POST("/assets/upload", assetUploadAccess, handlers.UploadAssetHandler)
		authorized.GET("/ai/policy", handlers.GetAIRuntimePolicyHandler)
		authorized.GET("/ai/policy/admin", middleware.RequireAnyPermission(authz.PermissionManage), handlers.GetAIAdminPolicyHandler)
		authorized.POST("/ai/policy/admin", middleware.RequireAnyPermission(authz.PermissionManage), handlers.UpdateAIAdminPolicyHandler)
		authorized.POST("/ai/proxy", middleware.AIPolicyGuard(), middleware.AIProxyIngressGuard(), handlers.AiProxyHandler)

		materialGroup := authorized.Group("/materials")
		materialGroup.Use(middleware.RequireAnyPermission(authz.MenuEngineering, authz.MenuTrading, authz.MenuWarehouse))
		{
			materialGroup.GET("", handlers.GetMaterialsHandler)
			materialGroup.POST("", adminOnly, handlers.SaveMaterialHandler)
			materialGroup.PATCH("/:id", materialUpdate, handlers.PatchMaterialHandler)
			materialGroup.DELETE("/:id", adminOnly, handlers.DeleteMaterialHandler)
			materialGroup.POST("/sync", adminOnly, handlers.BulkSyncMaterialsHandler)
		}

		rawMaterialGroup := authorized.Group("/raw-materials")
		rawMaterialGroup.Use(middleware.RequireAnyPermission(authz.MenuTrading, authz.MenuWarehouse, authz.MenuEngineering))
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
		}

		appearanceGroup := authorized.Group("/engineering/product-appearances")
		appearanceGroup.Use(middleware.RequireAnyPermission(authz.MenuEngineering, authz.MenuTrading))
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
			engineeringGroup.GET("/bom/:id/tree-projection", handlers.GetBOMTreeProjection)
			engineeringGroup.POST("/bom", bomManage, handlers.SaveBOMHandler)
			engineeringGroup.POST("/bom/:id/promote", bomPromote, handlers.PromoteBOMStatusHandler)
			engineeringGroup.POST("/bom/:id/derive-mbom", bomManage, handlers.DeriveMBOMFromEBOMHandler)
			// MBOM 工艺修订：菜单权限兜底（按你的决定，不单独引入 action 权限位）
			engineeringGroup.POST("/bom/:id/revise", handlers.ReviseMBOMHandler)
			engineeringGroup.DELETE("/bom/:id", bomManage, handlers.DeleteBOMHandler)
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
		logisticsConfigGroup.Use(middleware.RequireAnyPermission(authz.MenuSettings, authz.MenuTrading))
		{
			logisticsConfigGroup.GET("/vehicle-specs", handlers.GetVehicleSpecsCatalogHandler)
			logisticsConfigGroup.POST("/vehicle-specs/:id/photos", handlers.SaveVehicleSpecPhotoHandler)
		}

		vehicleLoadingGroup := authorized.Group("/logistics/vehicle-loading")
		vehicleLoadingGroup.Use(middleware.RequireAnyPermission(authz.MenuSettings, authz.MenuTrading))
		{
			vehicleLoadingGroup.POST("/recommendations", handlers.GetVehicleLoadingRecommendationsHandler)
		}

		shippingManagementGroup := authorized.Group("/shipping-management")
		shippingManagementGroup.Use(middleware.RequireAnyPermission(authz.MenuTrading, authz.MenuSettings))
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
		packagingGroup.Use(middleware.RequireAnyPermission(authz.MenuEngineering, authz.MenuTrading))
		{
			packagingGroup.GET("", handlers.GetPackagingRulesHandler)
			packagingGroup.POST("", adminOnly, handlers.SavePackagingRuleHandler)
			packagingGroup.DELETE("/:id", adminOnly, handlers.DeletePackagingRuleHandler)
			packagingGroup.GET("/profiles", handlers.GetPackagingProfilesHandler)
			packagingGroup.POST("/profiles", adminOnly, handlers.SavePackagingProfileHandler)
			packagingGroup.DELETE("/profiles/:id", adminOnly, handlers.DeletePackagingProfileHandler)
		}

		pdaGroup := authorized.Group("/pda")
		pdaGroup.Use(middleware.RequireAnyPermission(authz.MenuPDA))
		{
			pdaGroup.POST("/ingest", handlers.PDAIngestScanHandler)
			pdaGroup.POST("/scan", handlers.PDASubmitScanHandler)
			pdaGroup.POST("/sync", handlers.PDASyncResultsHandler)
		}

		traceGroup := authorized.Group("/trace")
		traceGroup.Use(middleware.RequireAnyPermission(authz.MenuTrading, authz.MenuProdConfig, authz.MenuQuality, authz.MenuWarehouse, authz.MenuSettings))
		{
			traceGroup.POST("/wheel/lookup", handlers.LookupWheelTraceHandler)
		}

		statusGroup := authorized.Group("/system/status")
		{
			statusGroup.GET("", middleware.RequireAnyPermission(authz.MenuSystem), handlers.SystemStatusHandler)
			statusGroup.GET("/alerts/active", middleware.RequireAnyPermission(authz.MenuSystem), handlers.GetActiveAlertsHandler)
			statusGroup.GET("/alerts/diagnostic", middleware.RequireAnyPermission(authz.MenuSystem), handlers.GetAlertDiagnosticsHandler)
		}

		// --- 企业配置 (Enterprise Config) ---
		authorized.GET("/enterprise/config", middleware.RequireAnyPermission(authz.MenuSettings), handlers.GetEnterpriseConfigHandler)
		authorized.POST("/enterprise/config", adminOnly, handlers.SaveEnterpriseConfigHandler)

		// --- 工作流引擎路由 (Workflow Routing) ---
		routingGroup := authorized.Group("/system/routing")
		{
			routingGroup.GET("/event-source-phase-catalog", middleware.RequireAnyPermission(authz.MenuSystem), handlers.GetBusinessEventPhaseCatalogHandler)
			routingGroup.GET("/event-sources", middleware.RequireAnyPermission(authz.MenuSystem), handlers.GetBusinessEventSourcesHandler)
			routingGroup.POST("/event-sources", adminOnly, handlers.SaveBusinessEventSourceHandler)
			routingGroup.POST("/event-sources/:id/status-rename-transaction", adminOnly, handlers.CommitBusinessEventStatusRenameTransactionHandler)
			routingGroup.PUT("/event-sources/:id", adminOnly, handlers.UpdateBusinessEventSourceHandler)
			routingGroup.DELETE("/event-sources/:id", adminOnly, handlers.DeleteBusinessEventSourceHandler)

			routingGroup.GET("/commands", middleware.RequireAnyPermission(authz.MenuSystem), handlers.GetCommandsHandler)
			routingGroup.POST("/commands", adminOnly, handlers.SaveCommandHandler)
			routingGroup.PUT("/commands/:id", adminOnly, handlers.UpdateCommandHandler)
			routingGroup.DELETE("/commands/:id", adminOnly, handlers.DeleteCommandHandler)

			routingGroup.GET("/rules", middleware.RequireAnyPermission(authz.MenuSystem), handlers.GetRulesHandler)
			routingGroup.POST("/rules", adminOnly, handlers.SaveRuleHandler)
			routingGroup.PUT("/rules/:id", adminOnly, handlers.UpdateRuleHandler)
			routingGroup.DELETE("/rules/:id", adminOnly, handlers.DeleteRuleHandler)

			routingGroup.GET("/execution-logs", middleware.RequireAnyPermission(authz.MenuSystem), handlers.GetRuleExecutionLogsHandler)
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
			numberingGroup.GET("/rules", middleware.RequireAnyPermission(authz.MenuSettings), handlers.GetNumberingRulesHandler)
			numberingGroup.POST("/rules", adminOnly, handlers.SaveNumberingRuleHandler)
		}

		linearBarcodeProtocolGroup := authorized.Group("/protocols/linear-barcode")
		linearBarcodeProtocolGroup.Use(middleware.RequireAnyPermission(authz.MenuSettings))
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

	// CSRF Token 端点 (公开访问)
	api.GET("/csrf-token", func(c *gin.Context) {
		if err := middleware.SetCSRFToken(c); err != nil {
			c.JSON(500, gin.H{"error": "生成 CSRF Token 失败"})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
	})

	api.POST("/auth/login", middleware.LoginRateLimitMiddleware(), handlers.LoginHandler)
	api.POST("/auth/logout", middleware.CSRFProtection(), handlers.LogoutHandler)
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

func registerBasicUnitRoutes(authorized *gin.RouterGroup) {
	unitGroup := authorized.Group("/basic/units")
	unitGroup.Use(middleware.RequireAnyPermission(authz.MenuSettings, authz.MenuEngineering, authz.MenuTrading))
	unitGroup.GET("", handlers.GetUnitsHandler)
	unitGroup.POST("", middleware.RequireAnyPermission(authz.PermissionManage), handlers.SaveUnitHandler)
	unitGroup.PATCH("/:id", middleware.RequireAnyPermission(authz.PermissionManage), handlers.PatchUnitHandler)
	unitGroup.POST("/sync", middleware.RequireAnyPermission(authz.PermissionManage), handlers.BulkSyncUnitsHandler)
	unitGroup.DELETE("/:id", middleware.RequireAnyPermission(authz.PermissionManage), handlers.DeleteUnitHandler)
}

func registerKnowledgeBaseRoutes(authorized *gin.RouterGroup) {
	knowledgeGroup := authorized.Group("/knowledge-base")
	knowledgeGroup.GET("/entries/search", handlers.SearchKnowledgeBaseEntriesHandler)
	knowledgeGroup.GET("/entries", middleware.RequireAnyPermission(authz.MenuSettings), handlers.GetKnowledgeBaseEntriesHandler)
	knowledgeGroup.POST("/entries", middleware.RequireAnyPermission(authz.PermissionManage), handlers.CreateKnowledgeBaseEntryHandler)
	knowledgeGroup.PUT("/entries/:id", middleware.RequireAnyPermission(authz.PermissionManage), handlers.UpdateKnowledgeBaseEntryHandler)
	knowledgeGroup.POST("/entries/:id/view", handlers.RecordKnowledgeBaseEntryViewHandler)
	knowledgeGroup.DELETE("/entries/:id", middleware.RequireAnyPermission(authz.PermissionManage), handlers.DeleteKnowledgeBaseEntryHandler)
}

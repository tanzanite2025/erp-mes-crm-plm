package authz

const (
	MenuDashboard       = "menu_dashboard"
	MenuWarehouse       = "menu_warehouse"
	MenuWarehouseConfig = "menu_warehouse_config"
	MenuMrp             = "menu_mrp"
	MenuApsScheduling   = "menu_aps_scheduling"
	MenuTrading         = "menu_trading"
	MenuPurchase        = "menu_purchase"
	MenuOrg             = "menu_org"
	MenuEngineering     = "menu_engineering"
	MenuQuality         = "menu_quality"
	MenuProdConfig      = "menu_prod_config"
	MenuPiecework       = "menu_piecework"
	MenuEquipment       = "menu_equipment"
	MenuSystem          = "menu_system"
	MenuSettings        = "menu_settings"
	MenuCodeCenter      = "menu_code_center"
	MenuApproval        = "menu_approval"
	MenuPDA             = "menu_pda"
)

const (
	PermissionUserView   = "user_view"
	PermissionUserCreate = "user_create"
	PermissionUserEdit   = "user_edit"
	PermissionUserDelete = "user_delete"
	PermissionUserInvite = "user_invite"
	PermissionManage     = "perm_manage"
)

const (
	ActionWarehouseInboundRecord     = "action_warehouse_inbound_record"
	ActionWarehouseShipmentRecord    = "action_warehouse_shipment_record"
	ActionWarehouseShipmentUpdate    = "action_inventory_shipment_update"
	ActionWarehouseShipmentCommit    = "action_warehouse_shipment_commit"
	ActionWarehouseShipmentVoid      = "action_warehouse_shipment_void"
	ActionWarehouseTransfer          = "action_warehouse_transfer"
	ActionWarehouseReconcile         = "action_warehouse_reconcile"
	ActionWarehouseSync              = "action_warehouse_sync"
	ActionWarehouseCategoryManage    = "action_warehouse_category_manage"
	ActionWarehouseStocktakeManage   = "action_warehouse_stocktake_manage"
	ActionWarehouseAdjustmentSubmit  = "action_warehouse_adjustment_submit"
	ActionWarehouseAdjustmentUpdate  = "action_inventory_adjustment_update"
	ActionWarehouseAdjustmentExecute = "action_warehouse_adjustment_execute"
)

const (
	ActionTradingSalesOrderManage        = "action_trading_sales_order_manage"
	ActionTradingSalesOrderDelete        = "action_trading_sales_order_delete"
	ActionTradingSalesOrderSync          = "action_trading_sales_order_sync"
	ActionTradingCustomerManage          = "action_trading_customer_manage"
	ActionTradingCustomerDelete          = "action_trading_customer_delete"
	ActionTradingCustomerSync            = "action_trading_customer_sync"
	ActionTradingSupplierManage          = "action_trading_supplier_manage"
	ActionTradingSupplierDelete          = "action_trading_supplier_delete"
	ActionTradingSupplierSync            = "action_trading_supplier_sync"
	ActionTradingPurchaseOrderManage     = "action_trading_purchase_order_manage"
	ActionTradingPurchaseOrderDelete     = "action_trading_purchase_order_delete"
	ActionTradingPurchaseOrderSync       = "action_trading_purchase_order_sync"
	ActionTradingLogisticsManage         = "action_trading_logistics_manage"
	ActionTradingLogisticsStatusUpdate   = "action_trading_logistics_status_update"
	ActionTradingLogisticsDelete         = "action_trading_logistics_delete"
	ActionTradingLogisticsProviderManage = "action_trading_logistics_provider_manage"
	ActionFinanceSettlementManage        = "action_finance_settlement_manage"
)

const (
	ActionEquipmentMoldManage      = "action_equipment_mold_manage"
	ActionEquipmentMoldSync        = "action_equipment_mold_sync"
	ActionEquipmentDrawingManage   = "action_equipment_drawing_manage"
	ActionEquipmentDrawingUpdate   = "action_equipment_drawing_update"
	ActionEquipmentDrawingDelete   = "action_equipment_drawing_delete"
	ActionEquipmentFurnaceManage   = "action_equipment_furnace_manage"
	ActionEquipmentFurnaceSync     = "action_equipment_furnace_sync"
	ActionEquipmentPartnerManage   = "action_equipment_partner_manage"
	ActionEquipmentPartnerUpdate   = "action_equipment_partner_update"
	ActionEquipmentLoanManage      = "action_equipment_loan_manage"
	ActionEquipmentTelemetryUpdate = "action_equipment_telemetry_update"
)

const (
	ActionMaterialUpdate = "action_material_update"
)

const (
	ActionEngineeringBOMManage  = "action_engineering_bom_manage"
	ActionEngineeringBOMPromote = "action_engineering_bom_promote"
)

const (
	ActionLabExperimentalCategoryCreate = "action_lab_experimental_category_create"
	ActionLabExperimentalCategoryDelete = "action_lab_experimental_category_delete"
)

const (
	ActionOrgProfileUpdate      = "action_org_profile_update"
	ActionEmployeeUpdate        = "action_employee_update"
	ActionHRDetailView          = "action_hr_detail_view"
	ActionEmployeeImportPreview = "action_employee_import_preview"
	ActionEmployeeImportCommit  = "action_employee_import_commit"
)

const (
	ActionProductionLineUpdate     = "action_production_line_update"
	ActionProductionPlanManage     = "action_production_plan_manage"
	ActionProductionIssuanceExecute = "action_production_issuance_execute"
	ActionBarcodeBindingManage      = "action_barcode_binding_manage"
)

const (
	ActionCuttingSizeInventoryRecord = "action_cutting_size_inventory_record"
)

const (
	ActionApprovalReview = "action_approval_review"
)

var AdminFallbackPermissions = []string{
	PermissionUserView,
	PermissionUserCreate,
	PermissionUserEdit,
	PermissionUserDelete,
	PermissionManage,
	MenuDashboard,
	MenuWarehouse,
	MenuWarehouseConfig,
	MenuMrp,
	MenuApsScheduling,
	MenuTrading,
	MenuPurchase,
	MenuOrg,
	MenuEngineering,
	MenuQuality,
	MenuProdConfig,
	MenuPiecework,
	MenuEquipment,
	MenuSystem,
	MenuSettings,
	MenuCodeCenter,
	MenuApproval,
	ActionWarehouseInboundRecord,
	ActionWarehouseShipmentRecord,
	ActionWarehouseShipmentUpdate,
	ActionWarehouseShipmentCommit,
	ActionWarehouseShipmentVoid,
	ActionWarehouseTransfer,
	ActionWarehouseReconcile,
	ActionWarehouseSync,
	ActionWarehouseCategoryManage,
	ActionWarehouseStocktakeManage,
	ActionWarehouseAdjustmentSubmit,
	ActionWarehouseAdjustmentUpdate,
	ActionWarehouseAdjustmentExecute,
	ActionTradingSalesOrderManage,
	ActionTradingSalesOrderDelete,
	ActionTradingSalesOrderSync,
	ActionTradingCustomerManage,
	ActionTradingCustomerDelete,
	ActionTradingCustomerSync,
	ActionTradingSupplierManage,
	ActionTradingSupplierDelete,
	ActionTradingSupplierSync,
	ActionTradingPurchaseOrderManage,
	ActionTradingPurchaseOrderDelete,
	ActionTradingPurchaseOrderSync,
	ActionTradingLogisticsManage,
	ActionTradingLogisticsStatusUpdate,
	ActionTradingLogisticsDelete,
	ActionTradingLogisticsProviderManage,
	ActionFinanceSettlementManage,
	ActionEquipmentMoldManage,
	ActionEquipmentMoldSync,
	ActionEquipmentDrawingManage,
	ActionEquipmentDrawingUpdate,
	ActionEquipmentDrawingDelete,
	ActionEquipmentFurnaceManage,
	ActionEquipmentFurnaceSync,
	ActionEquipmentPartnerManage,
	ActionEquipmentPartnerUpdate,
	ActionEquipmentLoanManage,
	ActionEquipmentTelemetryUpdate,
	ActionMaterialUpdate,
	ActionLabExperimentalCategoryCreate,
	ActionLabExperimentalCategoryDelete,
	ActionOrgProfileUpdate,
	ActionEmployeeUpdate,
	ActionHRDetailView,
	ActionEmployeeImportPreview,
	ActionEmployeeImportCommit,
	ActionProductionLineUpdate,
	ActionProductionPlanManage,
	ActionProductionIssuanceExecute,
	ActionBarcodeBindingManage,
	ActionCuttingSizeInventoryRecord,
	ActionApprovalReview,
	ActionEngineeringBOMManage,
	ActionEngineeringBOMPromote,
	MenuPDA,
}

var ManagedPermissionIDs = DeduplicatePermissionIDs(append([]string{
	PermissionUserInvite,
}, AdminFallbackPermissions...))

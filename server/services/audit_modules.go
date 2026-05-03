package services

// Legacy audit module constants kept here as the shared source of truth for now.
// Registry, alias, order, and stats responsibilities have been split into
// audit_registry.go, audit_alias.go, and audit_stats.go.
const (
	AuditModuleSalesOrder        = "sales-order"
	AuditModulePurchaseOrder     = "purchase-order"
	AuditModuleCustomer          = "customer"
	AuditModuleSupplier          = "supplier"
	AuditModuleEmployee          = "employee"
	AuditModuleMaterial          = "material"
	AuditModuleInventory         = "inventory"
	AuditModuleShipment          = "shipment"
	AuditModuleLogistics         = "logistics"
	AuditModulePackagingAssembly = "packaging-assembly"
	AuditModuleChangeOrder       = "change-order"
	AuditModuleBOM               = "bom"
	AuditModuleUser              = "user"
	AuditModuleUserPermission    = "user-permission"
	AuditModuleRole              = "role"
	AuditModuleProductionLine    = "production-line"
)

const (
	AuditEngineModuleTrading     = "trading"
	AuditEngineModuleFinance     = "finance"
	AuditEngineModuleEquipment   = "equipment"
	AuditEngineModuleEngineering = "engineering"
	AuditEngineModuleWarehouse   = "warehouse"
)

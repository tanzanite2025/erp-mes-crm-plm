package services

import "strings"

// AuditEntityRegistration is the audit engine contract for one business entity.
// Business services own event production; this registry only declares monitoring scope.
type AuditEntityRegistration struct {
	EntityKey    string
	EngineModule string
	Integrated   bool
	// EntryIntegrated is the legacy name retained for source and response
	// compatibility. Getters mirror it from Integrated.
	EntryIntegrated     bool
	AllowModuleTimeline bool
	DisplayName         string
}

var auditEntityRegistry = []AuditEntityRegistration{
	{EntityKey: AuditModuleSalesOrder, EngineModule: AuditEngineModuleTrading, Integrated: true, DisplayName: "SalesOrder"},
	{EntityKey: AuditModulePurchaseOrder, EngineModule: AuditEngineModuleTrading, Integrated: true, AllowModuleTimeline: true, DisplayName: "PurchaseOrder"},
	{EntityKey: AuditModuleCustomer, EngineModule: AuditEngineModuleTrading, Integrated: true, DisplayName: "Customer"},
	{EntityKey: AuditModuleSupplier, EngineModule: AuditEngineModuleTrading, Integrated: true, AllowModuleTimeline: true, DisplayName: "Supplier"},
	{EntityKey: AuditModuleLogistics, EngineModule: AuditEngineModuleTrading, Integrated: true, AllowModuleTimeline: true, DisplayName: "Logistics"},

	{EntityKey: AuditModuleCurrency, EngineModule: AuditEngineModuleFinance, Integrated: true, DisplayName: "Currency"},
	{EntityKey: AuditModulePaymentTerm, EngineModule: AuditEngineModuleFinance, Integrated: true, DisplayName: "PaymentTerm"},
	{EntityKey: AuditModulePaymentMethod, EngineModule: AuditEngineModuleFinance, Integrated: true, DisplayName: "PaymentMethod"},
	{EntityKey: AuditModuleTaxRate, EngineModule: AuditEngineModuleFinance, Integrated: true, DisplayName: "TaxRate"},
	{EntityKey: AuditModuleExchangeRateConfig, EngineModule: AuditEngineModuleFinance, Integrated: true, DisplayName: "ExchangeRateConfig"},

	{EntityKey: AuditModuleMold, EngineModule: AuditEngineModuleEquipment, Integrated: true, DisplayName: "Mold"},
	{EntityKey: AuditModuleFurnace, EngineModule: AuditEngineModuleEquipment, Integrated: true, DisplayName: "Furnace"},
	{EntityKey: AuditModuleMaintenanceRecord, EngineModule: AuditEngineModuleEquipment, Integrated: true, DisplayName: "MaintenanceRecord"},
	{EntityKey: AuditModuleMoldDrawing, EngineModule: AuditEngineModuleEquipment, Integrated: true, DisplayName: "MoldDrawing"},
	{EntityKey: AuditModuleEquipmentPartner, EngineModule: AuditEngineModuleEquipment, Integrated: true, DisplayName: "EquipmentPartner"},
	{EntityKey: AuditModuleMoldLoan, EngineModule: AuditEngineModuleEquipment, Integrated: true, DisplayName: "MoldLoan"},

	{EntityKey: AuditModuleProduct, EngineModule: AuditEngineModuleEngineering, Integrated: true, AllowModuleTimeline: true, DisplayName: "Product"},
	{EntityKey: AuditModuleDrilling, EngineModule: AuditEngineModuleEngineering, Integrated: true, AllowModuleTimeline: true, DisplayName: "Drilling"},
	{EntityKey: AuditModuleEngineeringSpec, EngineModule: AuditEngineModuleEngineering, Integrated: true, AllowModuleTimeline: true, DisplayName: "EngineeringSpec"},
	{EntityKey: AuditModuleChangeOrder, EngineModule: AuditEngineModuleEngineering, Integrated: false, DisplayName: "ChangeOrder"},
	{EntityKey: AuditModuleBOM, EngineModule: AuditEngineModuleEngineering, Integrated: true, AllowModuleTimeline: true, DisplayName: "BOM"},

	{EntityKey: AuditModuleMaterial, EngineModule: AuditEngineModuleWarehouse, Integrated: true, DisplayName: "Material"},
	// Inventory and shipment still have legacy write paths without mandatory
	// audit errors; keep them visible as pending until those paths are unified.
	{EntityKey: AuditModuleInventory, EngineModule: AuditEngineModuleWarehouse, Integrated: false, AllowModuleTimeline: true, DisplayName: "Inventory"},
	{EntityKey: AuditModuleShipment, EngineModule: AuditEngineModuleWarehouse, Integrated: false, AllowModuleTimeline: true, DisplayName: "Shipment"},
	{EntityKey: AuditModulePackagingAssembly, EngineModule: AuditEngineModuleWarehouse, Integrated: true, AllowModuleTimeline: true, DisplayName: "PackagingAssembly"},
	// Stocktake create, PDA scan, and adjustment flows are not yet unified.
	{EntityKey: AuditModuleStocktake, EngineModule: AuditEngineModuleWarehouse, Integrated: false, DisplayName: "Stocktake"},

	{EntityKey: AuditModuleProductionLine, EngineModule: AuditEngineModuleProduction, Integrated: true, DisplayName: "ProductionLine"},
	{EntityKey: AuditModulePieceworkRate, EngineModule: AuditEngineModuleProduction, Integrated: true, DisplayName: "PieceworkRate"},
	// Team CRUD is still handler-owned and ignores audit failures.
	{EntityKey: AuditModuleTeam, EngineModule: AuditEngineModuleProduction, Integrated: false, DisplayName: "Team"},

	{EntityKey: AuditModuleInspectionStandard, EngineModule: AuditEngineModuleQuality, Integrated: true, DisplayName: "InspectionStandard"},
	{EntityKey: AuditModuleInspectionTask, EngineModule: AuditEngineModuleQuality, Integrated: true, DisplayName: "InspectionTask"},

	{EntityKey: AuditModuleOrganization, EngineModule: AuditEngineModuleOrganization, Integrated: true, DisplayName: "Organization"},
	{EntityKey: AuditModuleEmployee, EngineModule: AuditEngineModuleOrganization, Integrated: true, DisplayName: "Employee"},

	{EntityKey: AuditModuleUser, EngineModule: AuditEngineModuleSystem, Integrated: true, DisplayName: "User"},
	{EntityKey: AuditModuleUserPermission, EngineModule: AuditEngineModuleSystem, Integrated: true, AllowModuleTimeline: true, DisplayName: "UserPermission"},
	{EntityKey: AuditModuleRole, EngineModule: AuditEngineModuleSystem, Integrated: true, DisplayName: "Role"},
	{EntityKey: AuditModuleEnterpriseConfig, EngineModule: AuditEngineModuleSystem, Integrated: true, DisplayName: "EnterpriseConfig"},

	{EntityKey: AuditModuleApprovalRequest, EngineModule: AuditEngineModuleWorkflow, Integrated: true, DisplayName: "ApprovalRequest"},
}

func GetAuditEntityRegistry() []AuditEntityRegistration {
	registry := make([]AuditEntityRegistration, len(auditEntityRegistry))
	copy(registry, auditEntityRegistry)
	for index := range registry {
		registry[index].EntryIntegrated = registry[index].Integrated
	}
	return registry
}

func GetAuditEntityRegistration(entityKey string) (AuditEntityRegistration, bool) {
	normalized := NormalizeAuditModule(entityKey)
	if normalized == "" {
		return AuditEntityRegistration{}, false
	}
	for _, item := range auditEntityRegistry {
		if strings.EqualFold(item.EntityKey, normalized) {
			item.EntryIntegrated = item.Integrated
			return item, true
		}
	}
	return AuditEntityRegistration{}, false
}

func GetAuditEntityKeysByEngineModule(engineModule string) []string {
	normalized := strings.TrimSpace(engineModule)
	if normalized == "" {
		return nil
	}

	keys := make([]string, 0)
	for _, item := range auditEntityRegistry {
		if strings.EqualFold(item.EngineModule, normalized) {
			keys = append(keys, item.EntityKey)
		}
	}
	return keys
}

func IsAuditEntityIntegrated(entityKey string) bool {
	registration, ok := GetAuditEntityRegistration(entityKey)
	return ok && registration.Integrated
}

// IsAuditModuleTimelineAllowed limits unscoped timeline reads to the small
// set of modules that historically expose a deliberate module-level view.
// Registration alone must never grant access to every entity's history.
func IsAuditModuleTimelineAllowed(entityKey string) bool {
	registration, ok := GetAuditEntityRegistration(entityKey)
	return ok && registration.AllowModuleTimeline
}

// IsAuditEntryIntegrated is kept for callers using the legacy name.
func IsAuditEntryIntegrated(entityKey string) bool {
	return IsAuditEntityIntegrated(entityKey)
}

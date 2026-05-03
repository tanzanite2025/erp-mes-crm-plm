package services

import "strings"

type AuditEntityRegistration struct {
	EntityKey       string
	EngineModule    string
	EntryIntegrated bool
	DisplayName     string
}

var auditEntityRegistry = []AuditEntityRegistration{
	{EntityKey: AuditModuleSalesOrder, EngineModule: AuditEngineModuleTrading, EntryIntegrated: true, DisplayName: "SalesOrder"},
	{EntityKey: AuditModulePurchaseOrder, EngineModule: AuditEngineModuleTrading, EntryIntegrated: true, DisplayName: "PurchaseOrder"},
	{EntityKey: AuditModuleCustomer, EngineModule: AuditEngineModuleTrading, EntryIntegrated: true, DisplayName: "Customer"},
	{EntityKey: AuditModuleSupplier, EngineModule: AuditEngineModuleTrading, EntryIntegrated: true, DisplayName: "Supplier"},
	{EntityKey: AuditModuleEmployee, EngineModule: AuditEngineModuleEngineering, EntryIntegrated: true, DisplayName: "Employee"},
	{EntityKey: AuditModuleInventory, EngineModule: AuditEngineModuleWarehouse, EntryIntegrated: true, DisplayName: "Inventory"},
	{EntityKey: AuditModuleShipment, EngineModule: AuditEngineModuleWarehouse, EntryIntegrated: true, DisplayName: "Shipment"},
	{EntityKey: AuditModuleLogistics, EngineModule: AuditEngineModuleTrading, EntryIntegrated: true, DisplayName: "Logistics"},
	{EntityKey: AuditModulePackagingAssembly, EngineModule: AuditEngineModuleWarehouse, EntryIntegrated: true, DisplayName: "PackagingAssembly"},
	{EntityKey: AuditModuleChangeOrder, EngineModule: AuditEngineModuleEngineering, EntryIntegrated: true, DisplayName: "ChangeOrder"},
	{EntityKey: AuditModuleBOM, EngineModule: AuditEngineModuleEngineering, EntryIntegrated: true, DisplayName: "BOM"},
	{EntityKey: AuditModuleProductionLine, EngineModule: AuditEngineModuleEquipment, EntryIntegrated: false, DisplayName: "ProductionLine"},
}

func GetAuditEntityRegistry() []AuditEntityRegistration {
	registry := make([]AuditEntityRegistration, len(auditEntityRegistry))
	copy(registry, auditEntityRegistry)
	return registry
}

func GetAuditEntityRegistration(entityKey string) (AuditEntityRegistration, bool) {
	normalized := strings.TrimSpace(entityKey)
	if normalized == "" {
		return AuditEntityRegistration{}, false
	}
	for _, item := range auditEntityRegistry {
		if strings.EqualFold(item.EntityKey, normalized) {
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

func IsAuditEntryIntegrated(entityKey string) bool {
	registration, ok := GetAuditEntityRegistration(entityKey)
	if !ok {
		return false
	}
	return registration.EntryIntegrated
}

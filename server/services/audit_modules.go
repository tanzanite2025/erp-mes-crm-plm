package services

import "strings"

const (
	AuditModuleSalesOrder     = "sales-order"
	AuditModulePurchaseOrder  = "purchase-order"
	AuditModuleCustomer       = "customer"
	AuditModuleSupplier       = "supplier"
	AuditModuleEmployee       = "employee"
	AuditModuleProductionLine = "production-line"
)

const (
	AuditEngineModuleTrading     = "trading"
	AuditEngineModuleFinance     = "finance"
	AuditEngineModuleEquipment   = "equipment"
	AuditEngineModuleEngineering = "engineering"
	AuditEngineModuleWarehouse   = "warehouse"
)

type AuditEntityRegistration struct {
	Module          string
	EngineModule    string
	EntryIntegrated bool
	DisplayName     string
}

type AuditEngineModuleStats struct {
	ID                string   `json:"id"`
	TargetEntityCount int      `json:"targetEntityCount"`
	LoggedEntityCount int      `json:"loggedEntityCount"`
	EntryEntityCount  int      `json:"entryEntityCount"`
	Coverage          float64  `json:"coverage"`
	LogCoverage       float64  `json:"logCoverage"`
	EntryCoverage     float64  `json:"entryCoverage"`
	Connected         bool     `json:"connected"`
	Status            string   `json:"status"`
	LastEvent         string   `json:"lastEvent,omitempty"`
	ConnectedEntities []string `json:"connectedEntities"`
	LoggedEntities    []string `json:"loggedEntities"`
	EntryEntities     []string `json:"entryEntities"`
}

type AuditEngineStatsResponse struct {
	Modules []AuditEngineModuleStats `json:"modules"`
}

var auditEntityRegistry = []AuditEntityRegistration{
	{Module: AuditModuleSalesOrder, EngineModule: AuditEngineModuleTrading, EntryIntegrated: true, DisplayName: "SalesOrder"},
	{Module: AuditModulePurchaseOrder, EngineModule: AuditEngineModuleTrading, EntryIntegrated: true, DisplayName: "PurchaseOrder"},
	{Module: AuditModuleCustomer, EngineModule: AuditEngineModuleTrading, EntryIntegrated: true, DisplayName: "Customer"},
	{Module: AuditModuleSupplier, EngineModule: AuditEngineModuleTrading, EntryIntegrated: true, DisplayName: "Supplier"},
	{Module: AuditModuleEmployee, EngineModule: AuditEngineModuleEngineering, EntryIntegrated: true, DisplayName: "Employee"},
	{Module: AuditModuleProductionLine, EngineModule: AuditEngineModuleEquipment, EntryIntegrated: false, DisplayName: "ProductionLine"},
}

var auditEngineModuleOrder = []string{
	AuditEngineModuleTrading,
	AuditEngineModuleFinance,
	AuditEngineModuleEquipment,
	AuditEngineModuleEngineering,
	AuditEngineModuleWarehouse,
}

var auditModuleAliasMap = map[string][]string{
	AuditModuleSalesOrder: {
		AuditModuleSalesOrder,
		"SalesOrder",
	},
	AuditModulePurchaseOrder: {
		AuditModulePurchaseOrder,
		"PurchaseOrder",
	},
	AuditModuleCustomer: {
		AuditModuleCustomer,
		"Customer",
	},
	AuditModuleSupplier: {
		AuditModuleSupplier,
		"Supplier",
	},
	AuditModuleEmployee: {
		AuditModuleEmployee,
		"Employee",
	},
	AuditModuleProductionLine: {
		AuditModuleProductionLine,
		"ProductionLine",
	},
}

func normalizeAuditModule(module string) string {
	normalized := strings.TrimSpace(module)
	if normalized == "" {
		return ""
	}
	for canonical, aliases := range auditModuleAliasMap {
		for _, alias := range aliases {
			if normalized == alias {
				return canonical
			}
		}
	}
	return normalized
}

func expandAuditModuleAliases(module string) []string {
	canonical := normalizeAuditModule(module)
	if canonical == "" {
		return nil
	}
	aliases, ok := auditModuleAliasMap[canonical]
	if !ok {
		return []string{canonical}
	}
	return aliases
}

func ExpandAuditModuleAliasesForQuery(module string) []string {
	return expandAuditModuleAliases(module)
}

func NormalizeAuditModuleForStats(module string) string {
	return normalizeAuditModule(module)
}

func GetAuditEntityRegistry() []AuditEntityRegistration {
	registry := make([]AuditEntityRegistration, len(auditEntityRegistry))
	copy(registry, auditEntityRegistry)
	return registry
}

func GetAuditEngineModuleOrder() []string {
	order := make([]string, len(auditEngineModuleOrder))
	copy(order, auditEngineModuleOrder)
	return order
}

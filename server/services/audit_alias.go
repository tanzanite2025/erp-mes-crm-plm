package services

import "strings"

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
	AuditModuleMaterial: {
		AuditModuleMaterial,
		"Material",
	},
	AuditModuleUser: {
		AuditModuleUser,
		"User",
	},
	AuditModuleUserPermission: {
		AuditModuleUserPermission,
		"UserPermission",
	},
	AuditModuleRole: {
		AuditModuleRole,
		"Role",
	},
	AuditModuleProductionLine: {
		AuditModuleProductionLine,
		"ProductionLine",
	},
}

func NormalizeAuditModule(module string) string {
	normalized := strings.TrimSpace(module)
	if normalized == "" {
		return ""
	}
	for canonical, aliases := range auditModuleAliasMap {
		for _, alias := range aliases {
			if strings.EqualFold(normalized, alias) {
				return canonical
			}
		}
	}
	return normalized
}

func ExpandAuditModuleAliases(module string) []string {
	canonical := NormalizeAuditModule(module)
	if canonical == "" {
		return nil
	}
	aliases, ok := auditModuleAliasMap[canonical]
	if !ok {
		return []string{canonical}
	}
	result := make([]string, len(aliases))
	copy(result, aliases)
	return result
}

func ExpandAuditModuleAliasesForQuery(module string) []string {
	return ExpandAuditModuleAliases(module)
}

func NormalizeAuditModuleForStats(module string) string {
	return NormalizeAuditModule(module)
}

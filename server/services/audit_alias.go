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
	AuditModuleProduct: {
		AuditModuleProduct,
		"Product",
	},
	AuditModuleCustomer: {
		AuditModuleCustomer,
		"Customer",
	},
	AuditModuleSupplier: {
		AuditModuleSupplier,
		"Supplier",
	},
	AuditModuleDrilling: {
		AuditModuleDrilling,
		"Drilling",
		"DrillingPlan",
	},
	AuditModuleEngineeringSpec: {
		AuditModuleEngineeringSpec,
		"EngineeringSpec",
		"TechnicalSpec",
	},
	AuditModuleEmployee: {
		AuditModuleEmployee,
		"Employee",
	},
	AuditModuleMaterial: {
		AuditModuleMaterial,
		"Material",
	},
	AuditModuleInventory: {
		AuditModuleInventory,
		"Inventory",
	},
	AuditModuleShipment: {
		AuditModuleShipment,
		"Shipment",
	},
	AuditModuleLogistics: {
		AuditModuleLogistics,
		"Logistics",
	},
	AuditModulePackagingAssembly: {
		AuditModulePackagingAssembly,
		"PackagingAssembly",
	},
	AuditModuleChangeOrder: {
		AuditModuleChangeOrder,
		"ChangeOrder",
	},
	AuditModuleBOM: {
		AuditModuleBOM,
		"BOM",
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
	AuditModuleCurrency: {
		AuditModuleCurrency,
		"Currency",
	},
	AuditModulePaymentTerm: {
		AuditModulePaymentTerm,
		"PaymentTerm",
	},
	AuditModulePaymentMethod: {
		AuditModulePaymentMethod,
		"PaymentMethod",
	},
	AuditModuleTaxRate: {
		AuditModuleTaxRate,
		"TaxRate",
	},
	AuditModuleExchangeRateConfig: {
		AuditModuleExchangeRateConfig,
		"ExchangeRateConfig",
	},
	AuditModuleMold: {
		AuditModuleMold,
		"Mold",
	},
	AuditModuleFurnace: {
		AuditModuleFurnace,
		"Furnace",
	},
	AuditModuleMaintenanceRecord: {
		AuditModuleMaintenanceRecord,
		"MaintenanceRecord",
	},
	AuditModuleMoldDrawing: {
		AuditModuleMoldDrawing,
		"MoldDrawing",
	},
	AuditModuleEquipmentPartner: {
		AuditModuleEquipmentPartner,
		"EquipmentPartner",
	},
	AuditModuleMoldLoan: {
		AuditModuleMoldLoan,
		"MoldLoan",
	},
	AuditModuleStocktake: {
		AuditModuleStocktake,
		"Stocktake",
	},
	AuditModulePieceworkRate: {
		AuditModulePieceworkRate,
		"PieceworkRate",
	},
	AuditModuleTeam: {
		AuditModuleTeam,
		"Team",
	},
	AuditModuleInspectionStandard: {
		AuditModuleInspectionStandard,
		"InspectionStandard",
		"QualityStandard",
		"quality-standard",
	},
	AuditModuleInspectionTask: {
		AuditModuleInspectionTask,
		"InspectionTask",
	},
	AuditModuleOrganization: {
		AuditModuleOrganization,
		"Organization",
	},
	AuditModuleEnterpriseConfig: {
		AuditModuleEnterpriseConfig,
		"EnterpriseConfig",
	},
	AuditModuleApprovalRequest: {
		AuditModuleApprovalRequest,
		"ApprovalRequest",
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

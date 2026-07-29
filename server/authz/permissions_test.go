package authz

import "testing"

func TestAdminFallbackPermissionsIncludeKnownFinanceTabs(t *testing.T) {
	required := []string{
		"page_finance_management",
		"tab_finance_management_payment_methods",
		"tab_finance_management_payment_terms",
		"tab_finance_management_currency_rates",
		"tab_finance_management_taxation",
	}
	permissions := DeduplicatePermissionIDs(AdminFallbackPermissions)
	permissionSet := make(map[string]struct{}, len(permissions))
	for _, permissionID := range permissions {
		permissionSet[permissionID] = struct{}{}
	}

	for _, permissionID := range required {
		if _, ok := permissionSet[permissionID]; !ok {
			t.Fatalf("admin fallback permissions must include %s", permissionID)
		}
	}
}

func TestAdminFallbackPermissionsIncludeProductionOutsourceActions(t *testing.T) {
	required := []string{
		ActionOutsourcePartnerManage,
		ActionOutsourceOrderManage,
		ActionOutsourceTransferExecute,
		ActionOutsourceInspectionSubmit,
	}
	permissions := DeduplicatePermissionIDs(AdminFallbackPermissions)
	permissionSet := make(map[string]struct{}, len(permissions))
	for _, permissionID := range permissions {
		permissionSet[permissionID] = struct{}{}
	}

	for _, permissionID := range required {
		if _, ok := permissionSet[permissionID]; !ok {
			t.Fatalf("admin fallback permissions must include %s", permissionID)
		}
	}
}

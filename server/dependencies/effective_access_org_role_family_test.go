package dependencies

import (
	"testing"
	"time"
	"xdfc-server/models"
)

func TestResolvePermissionsForRoleMatchesOrgRoleFamily(t *testing.T) {
	testDB := setupEffectiveAccessTestDB(t)
	seedRole(t, testDB, "org_dept-9", `["page_trading_sales_orders"]`, time.Unix(100, 0))
	seedRole(t, testDB, "org_dept-9|Sales", `["menu_system"]`, time.Unix(200, 0))

	permissions := ResolvePermissionsForRole("org_dept-9|Legacy Sales")

	if !containsAll(permissions, "page_trading_sales_orders", "menu_trading", "menu_system") {
		t.Fatalf("expected org role family permissions, got %#v", permissions)
	}
}

func TestResolveEffectiveAccessProfileForUserIncludesAllDepartmentRoleVariants(t *testing.T) {
	testDB := setupEffectiveAccessTestDB(t)
	seedEmployee(t, testDB, "emp-variants", "dept-variants")
	seedRole(t, testDB, "org_dept-variants", `["menu_system"]`, time.Unix(100, 0))
	seedRole(t, testDB, "org_dept-variants|Trading", `["menu_trading"]`, time.Unix(200, 0))

	profile := ResolveEffectiveAccessProfileForUser(models.User{
		ID:         "user-variants",
		EmployeeID: "emp-variants",
	})

	if !containsAll(profile.EffectiveRoles, "org_dept-variants", "org_dept-variants|Trading") {
		t.Fatalf("expected department role variants in effective roles, got %#v", profile.EffectiveRoles)
	}
	if !containsAll(profile.Permissions, "menu_system", "menu_trading") {
		t.Fatalf("expected merged department permissions, got %#v", profile.Permissions)
	}
}

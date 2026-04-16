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

	permissions := ResolvePermissionsForRole("org_dept-9|Sales")

	if !containsAll(permissions, "page_trading_sales_orders", "menu_trading", "menu_system") {
		t.Fatalf("expected org role family permissions, got %#v", permissions)
	}
}

func TestResolveEffectiveAccessProfileForUserUsesOnlyExplicitPermissionsForEmployeeBoundUser(t *testing.T) {
	testDB := setupEffectiveAccessTestDB(t)
	seedEmployee(t, testDB, "emp-variants", "dept-variants")
	seedUserPermission(t, testDB, "user-variants", "menu_system", time.Unix(100, 0))
	seedUserPermission(t, testDB, "user-variants", "menu_trading", time.Unix(200, 0))

	profile := ResolveEffectiveAccessProfileForUser(models.User{
		ID:         "user-variants",
		EmployeeID: "emp-variants",
	})

	if !containsAll(profile.Permissions, "menu_system", "menu_trading") {
		t.Fatalf("expected explicit employee-bound user permissions, got %#v", profile.Permissions)
	}
}

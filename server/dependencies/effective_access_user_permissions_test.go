package dependencies

import (
	"testing"
	"time"
	"xdfc-server/models"
)

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

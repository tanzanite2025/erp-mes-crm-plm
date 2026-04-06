package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHasAnyRoleMatchesNormalizedRole(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set("role", " SuperAdmin ")

	if !HasAnyRole(ctx, "admin", "superadmin") {
		t.Fatalf("expected normalized role match")
	}
}

func TestHasAnyRoleMatchesEffectiveRolesFromContext(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set("role", "finance_manager")
	ctx.Set("effectiveRoles", []string{"finance_manager", "org_dept-1|研发部"})

	if !HasAnyRole(ctx, "org_dept-1|研发部") {
		t.Fatalf("expected effectiveRoles match")
	}
}

func TestRequireRolesRejectsUnauthorizedRole(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/protected", nil)
	ctx.Set("role", "user")

	called := false
	handler := RequireRoles("admin", "superadmin")
	handler(ctx)
	if !ctx.IsAborted() {
		called = true
	}

	if called {
		t.Fatalf("expected middleware to abort request")
	}

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, recorder.Code)
	}
}

func TestParsePermissionIDsNormalizesAndDeduplicates(t *testing.T) {
	t.Parallel()

	permissions := ParsePermissionIDs(`[" page_trading_sales_orders ","ACTION_TRADING_SALES_ORDER_MANAGE","user_view"]`)
	if len(permissions) != 3 {
		t.Fatalf("expected 3 unique normalized permissions, got %d", len(permissions))
	}
	if permissions[0] != "page_trading_sales_orders" ||
		permissions[1] != "action_trading_sales_order_manage" ||
		permissions[2] != "user_view" {
		t.Fatalf("unexpected permissions: %#v", permissions)
	}
}

func TestHasAnyPermissionMatchesNormalizedPermission(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set("permissions", []string{" Menu_Trading ", "user_view"})

	if !HasAnyPermission(ctx, "menu_trading") {
		t.Fatalf("expected normalized permission match")
	}
}

func TestHasAnyPermissionAllowsSuperadminBypass(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set("role", "superadmin")

	if !HasAnyPermission(ctx, "menu_trading") {
		t.Fatalf("expected superadmin bypass")
	}
}

func TestHasAnyPermissionAllowsEffectiveSuperadminBypass(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set("role", "finance_manager")
	ctx.Set("effectiveRoles", []string{"superadmin"})

	if !HasAnyPermission(ctx, "menu_trading") {
		t.Fatalf("expected effective superadmin bypass")
	}
}

func TestHasAnyPermissionReturnsFalseWhenPermissionsContextMissing(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Set("role", "finance_manager")
	ctx.Set("effectiveRoles", []string{"finance_manager", "org_dept-sales"})

	if HasAnyPermission(ctx, "menu_trading") {
		t.Fatalf("expected missing permissions context to fail instead of lazy fallback")
	}
}

func TestRequirePermissionsRejectsUnauthorizedPermission(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/protected", nil)
	ctx.Set("permissions", []string{"menu_quality"})

	handler := RequirePermissions("menu_trading")
	handler(ctx)

	if !ctx.IsAborted() {
		t.Fatalf("expected middleware to abort request")
	}

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, recorder.Code)
	}
}

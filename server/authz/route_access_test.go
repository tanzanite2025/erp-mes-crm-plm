package authz

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoutePermissionIDsProjectsTabRoutes(t *testing.T) {
	require.Equal(t, []string{"tab_code_center_linear_barcode_print"}, RoutePermissionIDs("/code-center/linear-barcode/print?search=1"))
	require.Equal(t, []string{"tab_warehouse_config_packaging_assembly"}, RoutePermissionIDs("/warehouse-config/packaging-assembly"))
}

func TestRoutePermissionIDsKeepsPageFallbackToMenu(t *testing.T) {
	require.Equal(t, []string{"page_purchase", "menu_purchase"}, RoutePermissionIDs("/purchase"))
}

func TestRoutePermissionIDsRejectsUnknownRoots(t *testing.T) {
	require.Nil(t, RoutePermissionIDs("/unknown-module/page"))
}

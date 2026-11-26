package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestQualityUnitCatalogReadAccessPreservesMaintenancePermissions(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`CREATE TABLE units (id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME, code TEXT, name TEXT, category TEXT, precision INTEGER, status TEXT, is_system BOOLEAN, description TEXT)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO units (id, code, name, category, status) VALUES ('pcs', 'PCS', '件', 'QUANTITY', 'active')`).Error)
	previousDatabase, previousCache := db.DB, db.RDB
	db.DB, db.RDB = database, nil
	t.Cleanup(func() { db.DB, db.RDB = previousDatabase, previousCache })
	permissions := []string{}
	router := gin.New()
	router.Use(func(c *gin.Context) { c.Set("permissions", permissions); c.Next() })
	registerBasicUnitRoutes(router.Group(""))
	for _, test := range []struct {
		permissions  []string
		method, path string
		status       int
	}{
		{nil, http.MethodGet, "/basic/units", http.StatusForbidden},
		{[]string{authz.MenuQuality}, http.MethodGet, "/basic/units", http.StatusOK},
		{[]string{authz.MenuPiecework}, http.MethodGet, "/basic/units", http.StatusOK},
		{[]string{authz.MenuPiecework}, http.MethodPost, "/basic/units", http.StatusForbidden},
		{[]string{authz.MenuQuality}, http.MethodPost, "/basic/units", http.StatusForbidden},
		{[]string{authz.MenuQuality, authz.PermissionManage}, http.MethodPatch, "/basic/units/pcs", http.StatusForbidden},
		{[]string{authz.MenuQuality, authz.PermissionManage}, http.MethodDelete, "/basic/units/pcs", http.StatusForbidden},
		{[]string{authz.MenuQuality, authz.PermissionManage}, http.MethodPost, "/basic/units/sync", http.StatusForbidden},
		{[]string{authz.MenuSettings}, http.MethodPost, "/basic/units", http.StatusForbidden},
	} {
		permissions = test.permissions
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(test.method, test.path, nil))
		require.Equal(t, test.status, response.Code, response.Body.String())
		if test.method == http.MethodGet && test.status == http.StatusOK {
			require.Contains(t, response.Body.String(), "PCS")
		}
	}
}

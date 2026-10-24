package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createIsolatedBOMLifecycleHTTPRequestPostgresDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("BOM_LIFECYCLE_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set BOM_LIFECYCLE_TEST_POSTGRES_DSN to verify isolated BOM HTTP transactions")
	}
	adminDatabase, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := adminDatabase.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "bom_lifecycle_http_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, adminDatabase.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, adminDatabase.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
	configuration, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	configuration.RuntimeParams["search_path"] = schemaName
	configuration.RuntimeParams["lock_timeout"] = "3000"
	configuration.RuntimeParams["statement_timeout"] = "6000"
	connection := stdlib.OpenDB(*configuration)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent), DisableForeignKeyConstraintWhenMigrating: true})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&models.BOM{}, &models.BOMItem{}, &models.BOMSection{}, &models.Material{}, &models.BOMVersionSnapshot{}, &models.AuditLog{}, &models.BusinessEventSource{}, &models.NotificationRule{}, &models.RuleExecutionLog{}, &models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}))
	require.NoError(t, database.Exec("CREATE UNIQUE INDEX bom_http_released_scope ON boms (product_id, bom_type, owner_type, owner_customer_id, version_level) WHERE status = 'RELEASED' AND deleted_at IS NULL").Error)
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	return database
}

func submitBOMLifecycleRegressionHTTPRequest(t *testing.T, router *gin.Engine, path string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	require.NoError(t, err)
	request := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestBOMThreeStateLifecycleHTTPAtomicPublicationAndErrorStatusContract(t *testing.T) {
	database := createIsolatedBOMLifecycleHTTPRequestPostgresDatabase(t)
	productID, materialID, actorID, itemID := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Model(&models.Product{}).Create(map[string]any{"id": productID, "sku": "BOM-HTTP-PRODUCT", "name": "BOM HTTP product"}).Error)
	require.NoError(t, database.Create(&models.Material{BaseModel: models.BaseModel{ID: materialID}, Code: "HTTP-CARBON", Name: "Carbon", Status: "Active"}).Error)
	require.NoError(t, database.Create(&models.BOMSection{Code: "PREPARE", Name: "Preparation", Active: true, IsDefault: true}).Error)
	permissions := []string{authz.MenuEngineering, authz.ActionEngineeringBOMManage}
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("permissions", permissions)
		c.Set("userId", actorID)
		c.Set("username", "bom-http-reviewer")
		c.Next()
	})
	group := router.Group("/engineering", middleware.RequireAnyPermission(authz.MenuEngineering))
	group.POST("/bom", middleware.RequireAnyPermission(authz.ActionEngineeringBOMManage), SaveBOMHandler)
	group.POST("/bom/:id/promote", middleware.RequireAnyPermission(authz.ActionEngineeringBOMPromote), PromoteBOMStatusHandler)
	group.POST("/bom/:id/revise", middleware.RequireAnyPermission(authz.ActionEngineeringBOMPromote), ReviseMBOMHandler)
	payload := map[string]any{
		"bomType": "EBOM", "productId": productID, "ownerType": "INTERNAL", "measuredWeight": 420, "measuredWeightUnit": "g", "publishOnSave": true,
		"masterDataControl": map[string]any{"effectiveFrom": "2020-02-29T00:00:00Z"},
		"items":             []map[string]any{{"id": itemID, "section": "PREPARE", "materialId": materialID, "unit": "m2", "unitUsage": 2, "wastagePercent": 5}},
		"relationSidecar":   map[string]any{"kind": "parent_children_protocol", "version": "v1", "protocolDraft": map[string]any{"rootChildren": []string{"recipe"}, "branchNodes": []map[string]any{{"id": "recipe", "parentId": "root", "children": []string{"leaf"}, "nodeKind": "branch", "branchRole": "collection", "label": "Recipe", "sectionCode": "PREPARE"}}, "itemNodes": []map[string]any{{"id": "leaf", "parentId": "recipe", "children": []string{}, "nodeKind": "item", "sectionCode": "PREPARE", "itemId": itemID}}}},
	}
	response := submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom", payload)
	require.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
	var count int64
	require.NoError(t, database.Model(&models.BOM{}).Count(&count).Error)
	require.Zero(t, count)
	permissions = append(permissions, authz.ActionEngineeringBOMPromote)
	payload["measuredWeightUnit"] = ""
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom", payload)
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	payload["measuredWeightUnit"] = "g"
	payload["publishOnSave"] = false
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom", payload)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var saved services.BOMDetailResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
	require.Equal(t, models.BOMStatusDraft, saved.Status)
	require.Equal(t, 1, saved.Version)
	require.Equal(t, itemID, saved.Items[0].ID)
	require.Equal(t, itemID, saved.RelationSidecar.ProtocolDraft.ItemNodes[0].ItemID)
	serializedEffectiveFrom, isString := saved.MasterDataControl.EffectiveFrom.(string)
	require.True(t, isString)
	effectiveFrom, err := time.Parse(time.RFC3339, serializedEffectiveFrom)
	require.NoError(t, err)
	require.Equal(t, "2020-02-29T00:00:00Z", effectiveFrom.UTC().Format(time.RFC3339))
	payload["id"], payload["version"], payload["publishOnSave"] = saved.ID, saved.Version, true
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom", payload)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
	require.Equal(t, models.BOMStatusReleased, saved.Status)
	require.True(t, saved.IsLocked)
	require.Equal(t, 3, saved.Version)
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom/"+saved.ID+"/promote", map[string]any{"status": "OBSOLETE", "expectedVersion": 1})
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom/"+saved.ID+"/promote", map[string]any{"status": "APPROVED", "expectedVersion": saved.Version})
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	delete(payload, "id")
	delete(payload, "version")
	replacementItemID := uuid.NewString()
	payload["items"].([]map[string]any)[0]["id"] = replacementItemID
	payload["relationSidecar"].(map[string]any)["protocolDraft"].(map[string]any)["itemNodes"].([]map[string]any)[0]["itemId"] = replacementItemID
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom", payload)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "RELEASED EBOM")
	require.NoError(t, database.Model(&models.BOM{}).Count(&count).Error)
	require.EqualValues(t, 1, count)
	require.NoError(t, database.Model(&models.BOMVersionSnapshot{}).Count(&count).Error)
	require.EqualValues(t, 3, count)
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom/"+saved.ID+"/promote", map[string]any{"status": " obsolete ", "expectedVersion": saved.Version})
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
	require.Equal(t, models.BOMStatusObsolete, saved.Status)
	payload["bomType"] = "MBOM"
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom", payload)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
	require.Equal(t, replacementItemID, saved.Items[0].ID)
	require.Equal(t, replacementItemID, saved.RelationSidecar.ProtocolDraft.ItemNodes[0].ItemID)
	permissions = []string{authz.MenuEngineering, authz.ActionEngineeringBOMManage}
	revisionPayload := map[string]any{"reason": "Verify replacement revision", "expectedVersion": saved.Version}
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom/"+saved.ID+"/revise", revisionPayload)
	require.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
	permissions = append(permissions, authz.ActionEngineeringBOMPromote)
	response = submitBOMLifecycleRegressionHTTPRequest(t, router, "/engineering/bom/"+saved.ID+"/revise", revisionPayload)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var revised services.BOMDetailResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &revised))
	require.True(t, revised.IsLocked)
	require.Equal(t, models.BOMStatusReleased, revised.Status)
	var previous models.BOM
	require.NoError(t, database.First(&previous, "id = ?", saved.ID).Error)
	require.Equal(t, models.BOMStatusObsolete, previous.Status)
	require.Equal(t, saved.Version+1, previous.Version)
}

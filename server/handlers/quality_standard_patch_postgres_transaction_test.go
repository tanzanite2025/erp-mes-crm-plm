package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createIsolatedQualityStandardPatchPostgresDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("QUALITY_STANDARD_PATCH_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set QUALITY_STANDARD_PATCH_TEST_POSTGRES_DSN to verify quality standard row locks and rollback")
	}
	adminDatabase, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := adminDatabase.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "quality_standard_patch_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, adminDatabase.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, adminDatabase.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })

	connectionConfig, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	connectionConfig.RuntimeParams["search_path"] = schemaName
	// The old handler waits for its own row lock; fail promptly on regression.
	connectionConfig.RuntimeParams["lock_timeout"] = "1000"
	connectionConfig.RuntimeParams["statement_timeout"] = "3000"
	connection := stdlib.OpenDB(*connectionConfig)
	connection.SetMaxOpenConns(3)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&models.InspectionStandard{}, &models.AuditLog{}, &models.Unit{}))
	require.NoError(t, database.Create(&models.Unit{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "G", Name: "克", Status: "active"}).Error)
	require.NoError(t, database.Exec(`CREATE TABLE approval_requests (id UUID PRIMARY KEY, target_id TEXT, created_at TIMESTAMP, deleted_at TIMESTAMP)`).Error)
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	return database
}

func submitQualityStandardPatchWithBoundedRequestContext(t *testing.T, router *gin.Engine, standardID string, payload InspectionStandardPatchRequest) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	require.NoError(t, err)
	requestContext, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	request := httptest.NewRequest(http.MethodPatch, "/quality/standards/"+standardID, bytes.NewReader(body)).WithContext(requestContext)
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestQualityStandardPatchPostgresSharesRowLockWithSaveAndRollsBackOnAuditFailure(t *testing.T) {
	database := createIsolatedQualityStandardPatchPostgresDatabase(t)
	standard := models.InspectionStandard{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		Code:      "QCP-TRANSACTION-REGRESSION", Name: "Weight protocol", Type: "FQC", Status: "DRAFT", Version: 1,
		Items: json.RawMessage(`[{"id":"weight","centerValue":450,"levels":[{"level":"A","min":445,"max":455},{"level":"S","min":444,"max":456}]}]`),
	}
	require.NoError(t, database.Create(&standard).Error)
	correctedItems := json.RawMessage(`[{"id":"weight","name":"重量","unit":"G","centerValue":450,"levels":[{"level":"S","tolerance":0,"min":450,"max":450},{"level":"A","deviationMinExclusive":0,"tolerance":5,"min":445,"max":455},{"level":"B","deviationMinExclusive":5,"tolerance":6,"min":444,"max":456}]}]`)
	deltaItem, err := json.Marshal(map[string]any{"o": standard.Items, "n": correctedItems})
	require.NoError(t, err)
	payload := InspectionStandardPatchRequest{
		Op: "PATCH", Metadata: InspectionStandardPatchMetadata{ID: standard.ID, Version: 1},
		Delta: map[string]json.RawMessage{"items": deltaItem},
	}
	router := gin.New()
	router.PATCH("/quality/standards/:id", func(c *gin.Context) {
		c.Set("username", "quality-transaction-regression")
		PatchInspectionStandardHandler(c)
	})

	t.Run("saves corrected grades without waiting for its own transaction", func(t *testing.T) {
		response := submitQualityStandardPatchWithBoundedRequestContext(t, router, standard.ID, payload)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var saved InspectionStandardResponse
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &saved))
		require.Equal(t, 1.1, saved.Version)
		require.JSONEq(t, string(correctedItems), string(saved.Items))
		var auditEntries []models.AuditLog
		require.NoError(t, database.Where("target_id = ?", standard.ID).Find(&auditEntries).Error)
		require.Len(t, auditEntries, 1)
		require.Equal(t, "quality-transaction-regression", auditEntries[0].Operator)
	})
	t.Run("rejects a stale version without changing the saved grades", func(t *testing.T) {
		response := submitQualityStandardPatchWithBoundedRequestContext(t, router, standard.ID, payload)
		require.Equal(t, http.StatusConflict, response.Code, response.Body.String())
		var saved models.InspectionStandard
		require.NoError(t, database.First(&saved, "id = ?", standard.ID).Error)
		require.Equal(t, 1.1, saved.Version)
		require.JSONEq(t, string(correctedItems), string(saved.Items))
	})
	t.Run("rolls back the standard update when audit recording fails", func(t *testing.T) {
		require.NoError(t, database.Exec("DROP TABLE audit_logs").Error)
		payload.Metadata.Version = 1.1
		payload.Delta = map[string]json.RawMessage{"name": json.RawMessage(`{"o":"Weight protocol","n":"Must roll back"}`)}
		response := submitQualityStandardPatchWithBoundedRequestContext(t, router, standard.ID, payload)
		require.Equal(t, http.StatusInternalServerError, response.Code, response.Body.String())
		var saved models.InspectionStandard
		require.NoError(t, database.First(&saved, "id = ?", standard.ID).Error)
		require.Equal(t, standard.Name, saved.Name)
		require.Equal(t, 1.1, saved.Version)
		require.JSONEq(t, string(correctedItems), string(saved.Items))
	})
}

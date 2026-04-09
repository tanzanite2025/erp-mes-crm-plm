package handlers

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func setupDictionaryConflictTestDB(t *testing.T) {
	t.Helper()
	setupHandlerSQLiteTestDB(t)

	schemaStatements := []string{
		`CREATE TABLE dict_groups (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			code TEXT NOT NULL,
			description TEXT,
			active BOOLEAN DEFAULT true,
			is_system BOOLEAN DEFAULT false
		)`,
		`CREATE UNIQUE INDEX idx_dict_groups_code ON dict_groups(code)`,
		`CREATE INDEX idx_dict_groups_deleted_at ON dict_groups(deleted_at)`,
		`CREATE TABLE dict_entries (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			group_id TEXT,
			label TEXT NOT NULL,
			code TEXT NOT NULL,
			description TEXT,
			options BLOB,
			sort_order INTEGER DEFAULT 0,
			active BOOLEAN DEFAULT true,
			is_system BOOLEAN DEFAULT false
		)`,
		`CREATE UNIQUE INDEX idx_dict_entries_code ON dict_entries(code)`,
		`CREATE INDEX idx_dict_entries_deleted_at ON dict_entries(deleted_at)`,
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}

	prevRDB := db.RDB
	db.RDB = redis.NewClient(&redis.Options{Addr: "127.0.0.1:0"})
	t.Cleanup(func() {
		if db.RDB != nil {
			_ = db.RDB.Close()
		}
		db.RDB = prevRDB
	})
}

func performPatchDictGroupRequest(t *testing.T, groupCode string, requestBody string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/dictionary/groups/"+groupCode, strings.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "code", Value: groupCode}}
	PatchDictGroupHandler(ctx)
	return recorder
}

func performPatchDictEntryRequest(t *testing.T, entryCode string, requestBody string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/dictionary/entries/"+entryCode, strings.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "code", Value: entryCode}}
	PatchDictEntryHandler(ctx)
	return recorder
}

func TestPatchDictGroupHandlerReturns409ForStaleVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupDictionaryConflictTestDB(t)

	groupID := uuid.NewString()
	now := time.Now().UTC().Truncate(time.Millisecond)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO dict_groups (id, created_at, updated_at, code, name, description, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, groupID, now, now, "WHEEL_SPEC", "Wheel Spec", "spec group", true, false).Error)

	staleVersion := now.Add(-2 * time.Second).Format(time.RFC3339Nano)
	requestBody := fmt.Sprintf(`{"name":"Wheel Spec Updated","version":"%s"}`, staleVersion)
	recorder := performPatchDictGroupRequest(t, "WHEEL_SPEC", requestBody)

	require.Equal(t, http.StatusConflict, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "stale dictionary group version")

	var persisted models.DictGroup
	require.NoError(t, db.DB.Where("id = ?", groupID).First(&persisted).Error)
	require.Equal(t, "Wheel Spec", persisted.Name)
}

func TestPatchDictEntryHandlerReturns409ForStaleVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupDictionaryConflictTestDB(t)

	groupID := uuid.NewString()
	entryID := uuid.NewString()
	now := time.Now().UTC().Truncate(time.Millisecond)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO dict_groups (id, created_at, updated_at, code, name, description, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, groupID, now, now, "BRAKE_GROUP", "Brake Group", "", true, false).Error)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO dict_entries (id, created_at, updated_at, group_id, label, code, description, options, sort_order, active, is_system)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, entryID, now, now, groupID, "Brake Type", "BRAKE_TYPE", "", []byte(`[{"label":"Disc","value":"DISC"}]`), 0, true, false).Error)

	staleVersion := now.Add(-1500 * time.Millisecond).Format(time.RFC3339Nano)
	requestBody := fmt.Sprintf(`{"label":"Brake Type Stale","version":"%s"}`, staleVersion)
	recorder := performPatchDictEntryRequest(t, "BRAKE_TYPE", requestBody)

	require.Equal(t, http.StatusConflict, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "stale dictionary entry version")

	var persisted models.DictEntry
	require.NoError(t, db.DB.Where("id = ?", entryID).First(&persisted).Error)
	require.Equal(t, "Brake Type", persisted.Label)
}

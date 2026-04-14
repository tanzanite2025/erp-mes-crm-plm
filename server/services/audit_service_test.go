package services

import (
	"encoding/json"
	"fmt"
	"testing"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupAuditServiceSQLiteDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, testDB.AutoMigrate(&models.AuditLog{}))

	return testDB
}

func TestDefaultAuditLoggerWriteNormalizesTradingModuleAlias(t *testing.T) {
	testDB := setupAuditServiceSQLiteDB(t)

	err := defaultAuditLogger{}.Write(testDB, AuditEntry{
		Module:   "SalesOrder",
		TargetID: "so-1",
		Action:   "Create",
	})
	require.NoError(t, err)

	var log models.AuditLog
	require.NoError(t, testDB.First(&log).Error)
	require.Equal(t, AuditModuleSalesOrder, log.Module)
	require.Equal(t, "so-1", log.TargetID)
	require.Equal(t, "Create", log.Action)
}

func TestDefaultAuditLoggerWriteNormalizesObjectDiffToArray(t *testing.T) {
	testDB := setupAuditServiceSQLiteDB(t)

	err := defaultAuditLogger{}.Write(testDB, AuditEntry{
		Module:   "Customer",
		TargetID: "cust-1",
		Action:   "CUSTOMER_SAVE",
		Diff:     json.RawMessage(`{"intent":"CUSTOMER_SAVE","payload":{"status":"Inactive","code":"CUST-001"}}`),
	})
	require.NoError(t, err)

	var log models.AuditLog
	require.NoError(t, testDB.First(&log).Error)

	var diff []audit.DiffItem
	require.NoError(t, json.Unmarshal(log.Diff, &diff))
	require.Len(t, diff, 2)
	require.Equal(t, "code", diff[0].Field)
	require.Equal(t, "CUST-001", diff[0].New)
	require.Equal(t, "status", diff[1].Field)
	require.Equal(t, "Inactive", diff[1].New)
}

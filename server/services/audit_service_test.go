package services

import (
	"fmt"
	"testing"
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

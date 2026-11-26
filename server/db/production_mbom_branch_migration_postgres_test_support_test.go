package db

import (
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openIsolatedProductionMBOMBranchMigrationPostgresDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN for isolated PostgreSQL MBOM migration checks")
	}

	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := admin.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "production_mbom_migration_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, admin.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, admin.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })

	configuration, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	configuration.RuntimeParams["search_path"] = schemaName
	configuration.RuntimeParams["statement_timeout"] = "15000"
	connection := stdlib.OpenDB(*configuration)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	return database
}

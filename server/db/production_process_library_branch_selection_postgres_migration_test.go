package db

import (
	"os"
	"strings"
	"testing"

	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestProductionProcessLibraryBranchSelectionPostgresMigrationCreatesRequiredConstraints(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN for isolated PostgreSQL process selection migration checks")
	}

	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := admin.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "production_process_library_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, admin.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, admin.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })

	configuration, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	configuration.RuntimeParams["search_path"] = schemaName
	connection := stdlib.OpenDB(*configuration)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)

	require.NoError(t, database.AutoMigrate(
		&models.ProcessStep{},
		&models.ProductionBOMBranchOperation{},
		&models.ProductionBOMBranchOperationProcessLibrarySelection{},
	))
	require.NoError(t, database.AutoMigrate(
		&models.ProcessStep{},
		&models.ProductionBOMBranchOperation{},
		&models.ProductionBOMBranchOperationProcessLibrarySelection{},
	), "restarting migration must be idempotent")

	var indexDefinition string
	require.NoError(t, database.Raw(`SELECT indexdef FROM pg_indexes
		WHERE schemaname = current_schema() AND indexname = 'idx_bom_branch_process_library_selection_unique'`).Scan(&indexDefinition).Error)
	require.Contains(t, indexDefinition, "WHERE (deleted_at IS NULL)")
	var foreignKeyCount int64
	require.NoError(t, database.Raw(`SELECT count(*) FROM pg_constraint
		WHERE conrelid = 'production_bom_branch_operation_process_library_selections'::regclass AND contype = 'f'`).Scan(&foreignKeyCount).Error)
	require.EqualValues(t, 2, foreignKeyCount)

	processLibrary := models.ProcessStep{Code: "PROCESS-SELECTION-MIGRATION", Name: "迁移验证工序", IsActive: true}
	branchOperation := models.ProductionBOMBranchOperation{ProductID: uuid.NewString(), BOMOwnerType: "INTERNAL", Name: "迁移验证 L3", IsActive: true}
	require.NoError(t, database.Create(&processLibrary).Error)
	require.NoError(t, database.Create(&branchOperation).Error)
	selection := models.ProductionBOMBranchOperationProcessLibrarySelection{
		ProductID: branchOperation.ProductID, BOMOwnerType: branchOperation.BOMOwnerType,
		BranchOperationID: branchOperation.ID, ProcessLibraryID: processLibrary.ID,
	}
	require.NoError(t, database.Create(&selection).Error)

	duplicateBranchOperation := models.ProductionBOMBranchOperation{ProductID: branchOperation.ProductID, BOMOwnerType: "INTERNAL", Name: "重复选择 L3", IsActive: true}
	require.NoError(t, database.Create(&duplicateBranchOperation).Error)
	duplicateSelection := models.ProductionBOMBranchOperationProcessLibrarySelection{
		ProductID: branchOperation.ProductID, BOMOwnerType: "INTERNAL",
		BranchOperationID: duplicateBranchOperation.ID, ProcessLibraryID: processLibrary.ID,
	}
	require.Error(t, database.Create(&duplicateSelection).Error, "one branch cannot select the same process library entry twice")
	require.NoError(t, database.Delete(&selection).Error)
	require.NoError(t, database.Create(&duplicateSelection).Error, "a cancelled selection can be selected again")
}

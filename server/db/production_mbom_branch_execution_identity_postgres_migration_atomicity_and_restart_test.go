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

func openIsolatedProductionMBOMBranchMigrationPostgresDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN for isolated PostgreSQL production identity migration tests")
	}
	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := admin.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "production_branch_migration_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, admin.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, admin.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
	config, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	config.RuntimeParams["search_path"] = schemaName
	config.RuntimeParams["statement_timeout"] = "15000"
	connection := stdlib.OpenDB(*config)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	return database
}

func seedProductionMBOMBranchPostgresMigrationWithLegacyExecutionFacts(t *testing.T, database *gorm.DB) string {
	t.Helper()
	require.NoError(t, database.AutoMigrate(&models.ProductionRoute{}, &models.ProductionRouteStep{}))
	productID := uuid.NewString()
	operation := models.ProductionBOMBranchOperation{
		ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", Name: "裁切", IsActive: true,
	}
	require.NoError(t, database.Create(&operation).Error)
	routeFamilyID := uuid.NewString()
	require.NoError(t, database.AutoMigrate(&models.ProductionRouteFamily{}))
	routeFamily := models.ProductionRouteFamily{
		BaseModel: models.BaseModel{ID: routeFamilyID}, Code: "BRANCH-MIGRATION-ROUTE",
		ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
	}
	require.NoError(t, database.Create(&routeFamily).Error)
	retainedRouteID := ""
	previousRouteID := ""
	for revisionIndex, status := range []string{"DRAFT", "PUBLISHED"} {
		routeID := uuid.NewString()
		basedOnRouteID := productionMigrationRouteIDPointer(previousRouteID)
		route := models.ProductionRoute{
			BaseModel: models.BaseModel{ID: routeID}, RouteFamilyID: routeFamilyID,
			RevisionNo: revisionIndex + 1, BasedOnRouteID: basedOnRouteID,
			Code: status, Name: status, ProductID: productID,
			BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", Status: status,
			Steps: []models.ProductionRouteStep{{Sequence: 1, BranchOperationID: operation.ID}},
		}
		require.NoError(t, database.Create(&route).Error)
		if status == "DRAFT" {
			retainedRouteID = route.ID
		}
		previousRouteID = route.ID
	}
	for _, statement := range []string{
		`ALTER TABLE production_route_steps ADD COLUMN segment_id uuid, ADD COLUMN process_step_id uuid`,
		`CREATE TABLE product_barcode_states (id uuid PRIMARY KEY, current_process_step_id uuid)`,
		`CREATE TABLE product_barcode_state_events (id uuid PRIMARY KEY, state_id uuid REFERENCES product_barcode_states(id), from_process_step_id uuid, to_process_step_id uuid)`,
		`CREATE TABLE product_barcode_transfer_events (id uuid PRIMARY KEY, state_id uuid REFERENCES product_barcode_states(id), from_process_step_id uuid, to_process_step_id uuid)`,
		`CREATE TABLE production_execution_lots (id uuid PRIMARY KEY)`,
		`CREATE TABLE production_operation_executions (id uuid PRIMARY KEY, execution_lot_id uuid REFERENCES production_execution_lots(id), process_step_id uuid)`,
		`CREATE TABLE production_execution_command_request_receipts (id uuid PRIMARY KEY)`,
		`CREATE TABLE production_outsource_orders (id uuid PRIMARY KEY, status text)`,
		`CREATE TABLE production_outsource_order_lines (id uuid PRIMARY KEY, status text, sent_quantity numeric, returned_quantity numeric, accepted_quantity numeric, rejected_quantity numeric, rework_quantity numeric, scrap_quantity numeric, segment_id uuid, segment_name text, process_step_id uuid, process_code text, process_name text)`,
		`CREATE TABLE production_outsource_transfers (id uuid PRIMARY KEY, process_step_id uuid)`,
		`CREATE TABLE production_outsource_inspections (id uuid PRIMARY KEY, transfer_id uuid REFERENCES production_outsource_transfers(id), process_step_id uuid)`,
		`CREATE TABLE line_segment_process_mappings (line_segment_id uuid, process_step_id uuid)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	for _, tableName := range []string{
		"product_barcode_states", "product_barcode_state_events", "product_barcode_transfer_events",
		"production_execution_lots", "production_operation_executions", "production_execution_command_request_receipts",
		"production_outsource_transfers", "production_outsource_inspections",
	} {
		require.NoError(t, database.Exec("INSERT INTO "+tableName+" (id) VALUES (?)", uuid.NewString()).Error)
	}
	require.NoError(t, database.Exec(`UPDATE product_barcode_state_events SET state_id = (SELECT id FROM product_barcode_states LIMIT 1)`).Error)
	require.NoError(t, database.Exec(`UPDATE product_barcode_transfer_events SET state_id = (SELECT id FROM product_barcode_states LIMIT 1)`).Error)
	require.NoError(t, database.Exec(`UPDATE production_operation_executions SET execution_lot_id = (SELECT id FROM production_execution_lots LIMIT 1)`).Error)
	require.NoError(t, database.Exec(`UPDATE production_outsource_inspections SET transfer_id = (SELECT id FROM production_outsource_transfers LIMIT 1)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_outsource_orders (id, status) VALUES (?, 'SENT')`, uuid.NewString()).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_outsource_order_lines
		(id, status, sent_quantity, returned_quantity, accepted_quantity, rejected_quantity, rework_quantity, scrap_quantity)
		VALUES (?, 'SENT', 8, 4, 2, 2, 1, 1)`, uuid.NewString()).Error)
	return retainedRouteID
}

func productionMigrationRouteIDPointer(routeID string) *string {
	if strings.TrimSpace(routeID) == "" {
		return nil
	}
	return &routeID
}

func TestProductionMBOMBranchPostgresMigrationCleansLegacyUUIDFactsAndPreservesNewFactsOnRestart(t *testing.T) {
	database := openIsolatedProductionMBOMBranchMigrationPostgresDatabase(t)
	retainedRouteID := seedProductionMBOMBranchPostgresMigrationWithLegacyExecutionFacts(t, database)
	require.NoError(t, PrepareProductionBOMBranchOperationExecutionIdentityMigration(database))
	var routeIDs []string
	require.NoError(t, database.Model(&models.ProductionRoute{}).Pluck("id", &routeIDs).Error)
	require.Equal(t, []string{retainedRouteID}, routeIDs)
	for _, tableName := range []string{
		"product_barcode_states", "product_barcode_state_events", "product_barcode_transfer_events",
		"production_execution_lots", "production_operation_executions", "production_execution_command_request_receipts",
		"production_outsource_transfers", "production_outsource_inspections",
	} {
		var count int64
		require.NoError(t, database.Table(tableName).Count(&count).Error)
		require.Zero(t, count, tableName)
	}
	for _, legacyColumn := range productionBOMBranchOperationLegacyColumns {
		require.False(t, database.Migrator().HasColumn(legacyColumn.table, legacyColumn.column), legacyColumn.table+"."+legacyColumn.column)
	}
	require.False(t, database.Migrator().HasTable("line_segment_process_mappings"))
	var line models.OutsourceOrderLine
	require.NoError(t, database.Unscoped().Table("production_outsource_order_lines").Take(&line).Error)
	require.Equal(t, "DRAFT", line.Status)
	require.Zero(t, line.SentQuantity+line.ReturnedQuantity+line.AcceptedQuantity+line.RejectedQuantity+line.ReworkQuantity+line.ScrapQuantity)

	require.NoError(t, database.AutoMigrate(&models.ProductBarcodeState{}, &models.ProductBarcodeStateEvent{},
		&models.ProductBarcodeTransferEvent{}, &models.ProductionExecutionLot{}, &models.ProductionOperationExecution{}))
	newState := models.ProductBarcodeState{BaseModel: models.BaseModel{ID: uuid.NewString()}, ProductBarcode: "NEW-BRANCH-FACT"}
	require.NoError(t, database.Omit("route_id", "route_step_id", "current_branch_operation_id", "last_event_id").Create(&newState).Error)
	require.NoError(t, PrepareProductionBOMBranchOperationExecutionIdentityMigration(database))
	var count int64
	require.NoError(t, database.Model(&models.ProductBarcodeState{}).Where("id = ?", newState.ID).Count(&count).Error)
	require.EqualValues(t, 1, count)
}

func TestProductionMBOMBranchPostgresMigrationRollsBackFactsRoutesAndColumnsOnFailure(t *testing.T) {
	database := openIsolatedProductionMBOMBranchMigrationPostgresDatabase(t)
	seedProductionMBOMBranchPostgresMigrationWithLegacyExecutionFacts(t, database)
	require.NoError(t, database.Exec(`CREATE FUNCTION reject_execution_cleanup() RETURNS trigger LANGUAGE plpgsql AS $$
		BEGIN RAISE EXCEPTION 'injected production identity cleanup failure'; END $$`).Error)
	require.NoError(t, database.Exec(`CREATE TRIGGER reject_execution_cleanup BEFORE DELETE ON production_operation_executions
		FOR EACH ROW EXECUTE FUNCTION reject_execution_cleanup()`).Error)
	require.ErrorContains(t, PrepareProductionBOMBranchOperationExecutionIdentityMigration(database), "injected production identity cleanup failure")
	for _, tableName := range []string{"production_outsource_inspections", "product_barcode_state_events", "production_operation_executions"} {
		var count int64
		require.NoError(t, database.Table(tableName).Count(&count).Error)
		require.EqualValues(t, 1, count, tableName)
	}
	require.True(t, database.Migrator().HasColumn("production_route_steps", "process_step_id"))
	var routeCount int64
	require.NoError(t, database.Model(&models.ProductionRoute{}).Count(&routeCount).Error)
	require.EqualValues(t, 2, routeCount)
	require.NoError(t, database.Exec(`DROP TRIGGER reject_execution_cleanup ON production_operation_executions`).Error)
	require.NoError(t, PrepareProductionBOMBranchOperationExecutionIdentityMigration(database))
}

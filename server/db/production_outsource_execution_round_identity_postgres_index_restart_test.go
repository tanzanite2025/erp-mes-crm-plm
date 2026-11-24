package db

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestOutsourceExecutionRoundIndexesRebuildAcrossPostgresRestarts(t *testing.T) {
	database := openIsolatedProductionMBOMBranchMigrationPostgresDatabase(t)
	require.NoError(t, database.Exec(`CREATE TABLE production_outsource_transfers (
		id uuid PRIMARY KEY,
		outsource_order_line_id uuid NOT NULL,
		transfer_type text NOT NULL,
		product_barcode text NOT NULL,
		cycle_no integer NOT NULL DEFAULT 1
	)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE production_outsource_inspections (
		id uuid PRIMARY KEY,
		outsource_order_line_id uuid NOT NULL,
		product_barcode text NOT NULL,
		cycle_no integer NOT NULL DEFAULT 1,
		inspection_round_no integer NOT NULL DEFAULT 1
	)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE inspection_tasks (
		id uuid PRIMARY KEY,
		source_type text,
		source_line_id text,
		product_barcode text,
		source_cycle_no integer NOT NULL DEFAULT 1,
		inspection_round_no integer NOT NULL DEFAULT 1,
		deleted_at timestamptz
	)`).Error)
	require.NoError(t, database.Exec(`CREATE UNIQUE INDEX idx_outsource_transfer_line_type_barcode
		ON production_outsource_transfers (outsource_order_line_id, transfer_type, product_barcode)`).Error)
	require.NoError(t, database.Exec(`CREATE UNIQUE INDEX idx_outsource_inspection_line_barcode
		ON production_outsource_inspections (outsource_order_line_id, product_barcode)`).Error)
	require.NoError(t, database.Exec(`CREATE UNIQUE INDEX idx_inspection_task_source_barcode
		ON inspection_tasks (source_type, source_line_id, product_barcode)`).Error)

	previousDatabase := DB
	DB = database
	t.Cleanup(func() { DB = previousDatabase })
	ensureOutsourceExecutionRoundUniqueIndexes()
	ensureOutsourceExecutionRoundUniqueIndexes()

	for _, indexName := range []string{
		"idx_outsource_transfer_cycle_identity",
		"idx_outsource_inspection_round_identity",
		"idx_inspection_task_outsource_round_identity",
	} {
		var count int64
		require.NoError(t, database.Raw("SELECT COUNT(*) FROM pg_indexes WHERE schemaname = current_schema() AND indexname = ?", indexName).Scan(&count).Error)
		require.Equal(t, int64(1), count, indexName)
	}

	lineID := uuid.NewString()
	productBarcode := "BARCODE-ROUND-IDENTITY"
	require.NoError(t, database.Exec(`INSERT INTO production_outsource_transfers
		(id, outsource_order_line_id, transfer_type, product_barcode, cycle_no) VALUES (?, ?, 'SEND', ?, 1)`, uuid.NewString(), lineID, productBarcode).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_outsource_transfers
		(id, outsource_order_line_id, transfer_type, product_barcode, cycle_no) VALUES (?, ?, 'SEND', ?, 2)`, uuid.NewString(), lineID, productBarcode).Error)
	require.Error(t, database.Exec(`INSERT INTO production_outsource_transfers
		(id, outsource_order_line_id, transfer_type, product_barcode, cycle_no) VALUES (?, ?, 'SEND', ?, 2)`, uuid.NewString(), lineID, productBarcode).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_outsource_inspections
		(id, outsource_order_line_id, product_barcode, cycle_no, inspection_round_no) VALUES (?, ?, ?, 1, 1)`, uuid.NewString(), lineID, productBarcode).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_outsource_inspections
		(id, outsource_order_line_id, product_barcode, cycle_no, inspection_round_no) VALUES (?, ?, ?, 1, 2)`, uuid.NewString(), lineID, productBarcode).Error)
	require.Error(t, database.Exec(`INSERT INTO production_outsource_inspections
		(id, outsource_order_line_id, product_barcode, cycle_no, inspection_round_no) VALUES (?, ?, ?, 1, 2)`, uuid.NewString(), lineID, productBarcode).Error)
	for _, identity := range [][2]int{{1, 1}, {1, 2}, {2, 1}} {
		require.NoError(t, database.Exec(`INSERT INTO inspection_tasks
			(id, source_type, source_line_id, product_barcode, source_cycle_no, inspection_round_no) VALUES (?, 'PRODUCTION_OUTSOURCE', ?, ?, ?, ?)`,
			uuid.NewString(), lineID, productBarcode, identity[0], identity[1]).Error)
	}
	require.Error(t, database.Exec(`INSERT INTO inspection_tasks
		(id, source_type, source_line_id, product_barcode, source_cycle_no, inspection_round_no) VALUES (?, 'PRODUCTION_OUTSOURCE', ?, ?, 2, 1)`,
		uuid.NewString(), lineID, productBarcode).Error)
	require.NoError(t, database.Exec(`INSERT INTO inspection_tasks
		(id, source_type, source_line_id, product_barcode, source_cycle_no, inspection_round_no) VALUES (?, 'OTHER', ?, ?, 1, 1)`,
		uuid.NewString(), lineID, productBarcode).Error)
}

package services

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

// This opt-in fixture uses a fresh schema and a connection search_path containing
// that schema only. It never reads or migrates business tables in public.
func openIsolatedProductionMaterialIssuancePostgresConcurrencyTestDatabase(t *testing.T) (*gorm.DB, []ProductionMaterialIssuanceReviewedSourceBasis, string) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("PRODUCTION_MATERIAL_ISSUANCE_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PRODUCTION_MATERIAL_ISSUANCE_TEST_POSTGRES_DSN to verify production material issuance concurrency in an isolated schema")
	}
	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := admin.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "material_issuance_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, admin.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, admin.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
	config, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	config.RuntimeParams["search_path"], config.RuntimeParams["application_name"] = schemaName, schemaName
	config.RuntimeParams["lock_timeout"], config.RuntimeParams["statement_timeout"] = "5000", "10000"
	connection := stdlib.OpenDB(*config)
	connection.SetMaxOpenConns(5)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	// Migrate the line table explicitly; every association must exist in this isolated schema.
	require.NoError(t, database.AutoMigrate(&models.SalesOrder{}, &models.SalesOrderLine{}, &models.AuditLog{}, &models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceSourceSnapshot{}, &models.ProductionMaterialIssuanceActiveSourceCoverage{}, &models.ProductionMaterialIssuanceCommandReceipt{}, &models.ProductionMaterialIssuanceWarehouseMovement{}))
	// Complete warehouse columns before source review caches SELECT * query plans.
	for _, statement := range []string{
		`CREATE TABLE warehouse_categories (id UUID PRIMARY KEY, code TEXT, is_system BOOLEAN, active BOOLEAN, allow_shipment BOOLEAN, allow_inbound BOOLEAN, deleted_at TIMESTAMPTZ)`,
		`CREATE TABLE boms (id UUID PRIMARY KEY, product_id UUID, bom_type TEXT, bom_no TEXT, status TEXT, owner_type TEXT, owner_customer_id TEXT, version INTEGER, version_text TEXT, version_level TEXT, revision_no TEXT, measured_weight DOUBLE PRECISION, measured_weight_unit TEXT, effective_from TIMESTAMPTZ, effective_to TIMESTAMPTZ, deleted_at TIMESTAMPTZ)`,
		`CREATE TABLE bom_items (id UUID PRIMARY KEY, bom_id UUID, sort_order INTEGER, section TEXT, material_id UUID, unit TEXT, standard_usage DOUBLE PRECISION)`,
		`CREATE TABLE materials (id UUID PRIMARY KEY, code TEXT, name TEXT, spec TEXT, uom TEXT, status TEXT, deleted_at TIMESTAMPTZ)`,
		`CREATE TABLE products (id UUID PRIMARY KEY, sku TEXT, name TEXT, tech_series TEXT, brake_type TEXT, deleted_at TIMESTAMPTZ)`,
		`CREATE TABLE product_attribute_options (id UUID PRIMARY KEY, category TEXT, value TEXT, label TEXT, label_en TEXT, deleted_at TIMESTAMPTZ)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	orderID, productID, bomID, materialID := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO warehouse_categories VALUES (?, 'MATERIAL', TRUE, TRUE, TRUE, TRUE, NULL)`, uuid.NewString()).Error)
	require.NoError(t, database.Exec(`INSERT INTO products VALUES (?, 'SKU-1','产品','系列','碟刹',NULL)`, productID).Error)
	require.NoError(t, database.Exec(`INSERT INTO materials VALUES (?, 'M-1','材料','规格','kg','Active',NULL)`, materialID).Error)
	require.NoError(t, database.Exec(`INSERT INTO boms VALUES (?,?,'MBOM','MBOM-1','RELEASED','INTERNAL','',3,'V1','standard','A',480,'g',NULL,NULL,NULL)`, bomID, productID).Error)
	require.NoError(t, database.Exec(`INSERT INTO bom_items VALUES (?,?,1,'A',?,'kg',0.5)`, uuid.NewString(), bomID, materialID).Error)
	order := models.SalesOrder{ID: orderID, OrderNo: "SO-CONCURRENT", Version: 4, Status: "Pending", Evidences: json.RawMessage(`[]`), Lines: []models.SalesOrderLine{{ID: 101, LineNo: 1, ProductID: productID, Qty: 100, UOM: "PCS", Status: "Pending"}}}
	require.NoError(t, database.Create(&order).Error)
	bases, err := ReviewProductionMaterialIssuanceSources(context.Background(), database, []ProductionMaterialIssuanceSourceSelection{{SalesOrderID: orderID, SalesOrderLineID: 101, BOMID: bomID}})
	require.NoError(t, err)
	return database, bases, schemaName
}

func TestProductionMaterialIssuancePostgresConcurrentDispatchKeepsOneDocumentAndCoverage(t *testing.T) {
	for _, sameCommand := range []bool{false, true} {
		t.Run(map[bool]string{false: "different-commands", true: "same-command"}[sameCommand], func(t *testing.T) {
			database, bases, _ := openIsolatedProductionMaterialIssuancePostgresConcurrencyTestDatabase(t)
			actor := ProductionMaterialIssuanceCommandActor{UserID: "concurrent-user"}
			start, results := make(chan struct{}), make(chan error, 2)
			for index := 0; index < 2; index++ {
				commandID := "send-first"
				if index == 1 && !sameCommand {
					commandID = "send-second"
				}
				go func(command string) {
					<-start
					_, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, actor, buildProductionMaterialIssuanceDispatchTestRequest(command, bases))
					results <- err
				}(commandID)
			}
			close(start)
			successes := 0
			for index := 0; index < 2; index++ {
				select {
				case err := <-results:
					if err == nil {
						successes++
					} else {
						require.True(t, errors.Is(err, ErrProductionMaterialIssuanceBasisChanged) || errors.Is(err, ErrProductionMaterialIssuanceSourceCovered), err)
					}
				case <-time.After(15 * time.Second):
					t.Fatal("concurrent material dispatch did not finish")
				}
			}
			require.Positive(t, successes)
			requireProductionMaterialIssuancePersistedRecordCounts(t, database, 1, 1, 1, 1, 1)
		})
	}
}

func TestProductionMaterialIssuancePostgresDispatchWaitsForOrderEditAndRejectsOldBasis(t *testing.T) {
	database, bases, applicationName := openIsolatedProductionMaterialIssuancePostgresConcurrencyTestDatabase(t)
	editing := database.Begin()
	require.NoError(t, editing.Error)
	t.Cleanup(func() { editing.Rollback() })
	var order models.SalesOrder
	require.NoError(t, editing.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, "id = ?", bases[0].SalesOrderID).Error)
	result := make(chan error, 1)
	go func() {
		_, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "user-1"}, buildProductionMaterialIssuanceDispatchTestRequest("send", bases))
		result <- err
	}()
	require.Eventually(t, func() bool {
		var waiting int64
		err := database.Raw("SELECT count(*) FROM pg_stat_activity WHERE application_name = ? AND wait_event_type = 'Lock'", applicationName).Scan(&waiting).Error
		return err == nil && waiting > 0
	}, 3*time.Second, 20*time.Millisecond)
	require.NoError(t, editing.Model(&models.SalesOrderLine{}).Where("id = ?", bases[0].SalesOrderLineID).Update("qty", 150).Error)
	require.NoError(t, editing.Model(&order).Omit("Lines").Update("version", 5).Error)
	require.NoError(t, editing.Commit().Error)
	select {
	case err := <-result:
		require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)
	case <-time.After(15 * time.Second):
		t.Fatal("material dispatch did not finish after order edit")
	}
	requireProductionMaterialIssuancePersistedRecordCounts(t, database, 0, 0, 0, 0, 0)
}

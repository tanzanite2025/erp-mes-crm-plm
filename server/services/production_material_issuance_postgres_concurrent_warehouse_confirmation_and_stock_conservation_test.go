package services

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func openIsolatedProductionMaterialIssuanceWarehousePostgresConcurrencyTestDatabase(t *testing.T) (*gorm.DB, ProductionMaterialIssuanceDocumentDetail) {
	t.Helper()
	database, bases, _ := openIsolatedProductionMaterialIssuancePostgresConcurrencyTestDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.ProductionMaterialIssuanceWarehouseMovement{}, &models.ProductionMaterialIssuanceWarehouseMovementMaterial{}, &models.ProductionMaterialIssuanceOrderLineAllocation{}, &models.Inventory{}, &models.InventoryLedgerEntry{}, &models.Reservation{}))
	require.NoError(t, database.Exec(`INSERT INTO warehouse_categories (id,code,is_system,active,allow_shipment,allow_inbound) VALUES (?, ?, TRUE, TRUE, TRUE, TRUE)`, uuid.NewString(), models.ProductionMaterialPendingConsumptionWarehouseCategoryCode).Error)
	require.NoError(t, database.Create(&models.Inventory{BaseModel: models.BaseModel{ID: uuid.NewString()}, MaterialID: bases[0].Contributions[0].MaterialID, CategoryCode: "MATERIAL", BatchNo: "A", UOM: "kg", Quantity: 50, TotalValue: 250, AverageUnitCost: 5}).Error)
	detail, err := DispatchProductionMaterialIssuanceDocument(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "dispatcher"}, buildProductionMaterialIssuanceDispatchTestRequest("initial-dispatch", bases))
	require.NoError(t, err)
	return database, detail
}

func TestProductionMaterialIssuanceWarehousePostgresConcurrentSameDocumentConfirmationCommitsOnlyOnce(t *testing.T) {
	for _, sameCommand := range []bool{true, false} {
		t.Run(map[bool]string{true: "same-command", false: "different-commands"}[sameCommand], func(t *testing.T) {
			database, detail := openIsolatedProductionMaterialIssuanceWarehousePostgresConcurrencyTestDatabase(t)
			start, results := make(chan struct{}), make(chan error, 2)
			for index := 0; index < 2; index++ {
				commandID := "warehouse-first"
				if index == 1 && !sameCommand {
					commandID = "warehouse-second"
				}
				request := buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, commandID, models.ProductionMaterialMovementIssue, 1, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: 101, Quantity: 10})
				request.Materials[0].MaterialID = detail.Sources[0].Contributions[0].MaterialID
				go func() {
					<-start
					_, err := ConfirmProductionMaterialIssuanceWarehouseMovement(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user"}, request)
					if sameCommand && errors.Is(err, ErrProductionMaterialIssuanceBasisChanged) {
						_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(context.Background(), database, ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user"}, request)
					}
					results <- err
				}()
			}
			close(start)
			successes := 0
			for index := 0; index < 2; index++ {
				select {
				case err := <-results:
					if err == nil {
						successes++
					} else {
						require.ErrorIs(t, err, ErrProductionMaterialIssuanceBasisChanged)
					}
				case <-time.After(15 * time.Second):
					t.Fatal("warehouse confirmation did not finish")
				}
			}
			require.Positive(t, successes)
			if sameCommand {
				require.Equal(t, 2, successes)
			} else {
				require.Equal(t, 1, successes)
			}
			requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 1, 1, 1, 2, 2, 2)
			var pending models.Inventory
			require.NoError(t, database.First(&pending, "category_code = ?", models.ProductionMaterialPendingConsumptionWarehouseCategoryCode).Error)
			require.Equal(t, 10.0, pending.Quantity)
		})
	}
}

func TestProductionMaterialIssuanceWarehousePostgresDifferentDocumentsCannotOverdrawSharedBatch(t *testing.T) {
	database, first := openIsolatedProductionMaterialIssuanceWarehousePostgresConcurrencyTestDatabase(t)
	ctx := context.Background()
	orderID := uuid.NewString()
	secondOrder := models.SalesOrder{ID: orderID, OrderNo: "SO-OTHER-WAREHOUSE", Version: 1, Status: "Pending", Evidences: json.RawMessage(`[]`), Lines: []models.SalesOrderLine{{ID: 102, LineNo: 1, ProductID: first.Sources[0].ProductID, Qty: 100, UOM: "PCS", Status: "Pending"}}}
	require.NoError(t, database.Create(&secondOrder).Error)
	bases, err := ReviewProductionMaterialIssuanceSources(ctx, database, []ProductionMaterialIssuanceSourceSelection{{SalesOrderID: orderID, SalesOrderLineID: 102, BOMID: first.Sources[0].BOM.ID}})
	require.NoError(t, err)
	second, err := DispatchProductionMaterialIssuanceDocument(ctx, database, ProductionMaterialIssuanceCommandActor{UserID: "dispatcher"}, buildProductionMaterialIssuanceDispatchTestRequest("other-dispatch", bases))
	require.NoError(t, err)
	start, results := make(chan struct{}), make(chan error, 2)
	for _, detail := range []ProductionMaterialIssuanceDocumentDetail{first, second} {
		request := buildProductionMaterialIssuanceWarehouseConfirmationTestRequest(detail.Document.ID, "confirm-"+detail.Document.ID, models.ProductionMaterialMovementIssue, 1, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: detail.Sources[0].SalesOrderLineID, Quantity: 30})
		request.Materials[0].MaterialID = detail.Sources[0].Contributions[0].MaterialID
		go func() {
			<-start
			var err error
			for attempt := 0; attempt < 3; attempt++ {
				_, err = ConfirmProductionMaterialIssuanceWarehouseMovement(ctx, database, ProductionMaterialIssuanceCommandActor{UserID: "warehouse-user"}, request)
				if !errors.Is(err, ErrProductionMaterialIssuanceBasisChanged) {
					break
				}
			}
			results <- err
		}()
	}
	close(start)
	successes, shortages := 0, 0
	for index := 0; index < 2; index++ {
		select {
		case err := <-results:
			if err == nil {
				successes++
			} else {
				require.ErrorIs(t, err, ErrProductionMaterialIssuanceStockUnavailable)
				shortages++
			}
		case <-time.After(15 * time.Second):
			t.Fatal("shared batch confirmation did not finish")
		}
	}
	require.Equal(t, 1, successes)
	require.Equal(t, 1, shortages)
	requireProductionMaterialIssuanceWarehousePersistedCounts(t, database, 1, 1, 1, 2, 3, 3)
	var balances []models.Inventory
	require.NoError(t, database.Find(&balances).Error)
	require.Len(t, balances, 2)
	quantity, value := 0.0, 0.0
	for _, balance := range balances {
		require.GreaterOrEqual(t, balance.Quantity, 0.0)
		quantity += balance.Quantity
		value += balance.TotalValue
	}
	require.Equal(t, 50.0, quantity)
	require.Equal(t, 250.0, value)
}

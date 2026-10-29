package routes

import (
	"encoding/json"
	"net/http"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionMaterialIssuanceVersionedBatchQuerySharesReservationAndWarehouseScopeWithoutWriting(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	materialID := detail.Sources[0].Contributions[0].MaterialID
	for _, reservation := range []struct {
		batch, warehouse, status string
		quantity                 float64
	}{
		{"batch-A", "MATERIAL", "RESERVED", 30}, {"batch-A", "MATERIAL", "RELEASED", 60},
		{"batch-A", models.ProductionMaterialPendingConsumptionWarehouseCategoryCode, "RESERVED", 90},
		{"reservation-only", "MATERIAL", "RESERVED", 4},
	} {
		require.NoError(t, database.Exec(`INSERT INTO inventory_reservations (id,material_id,category_code,batch_no,quantity,status) VALUES (?,?,?,?,?,?)`, uuid.NewString(), materialID, reservation.warehouse, reservation.batch, reservation.quantity, reservation.status).Error)
	}
	body := marshalProductionMaterialIssuanceHTTPCommandTestBody(t, map[string]any{"expectedVersion": 1, "materialId": materialID})
	response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions([]string{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView}, "reader", "POST", "/documents/"+detail.Document.ID+"/material-batches", body)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
	var batches services.ProductionMaterialIssuanceMaterialBatchAvailability
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &batches))
	require.Equal(t, detail.Document.ID, batches.DocumentID)
	require.Equal(t, 1, batches.ExpectedVersion)
	require.Len(t, batches.Items, 1, "reservation-only batches are not pickable")
	require.Equal(t, "batch-A", batches.Items[0].BatchNo)
	require.Equal(t, 100.0, batches.Items[0].InventoryQty)
	require.Equal(t, 30.0, batches.Items[0].ReservedQty)
	require.Equal(t, 70.0, batches.Items[0].AvailableQty)
	aggregate, err := services.QueryMaterialInventoryAvailability(database, []string{materialID}, []string{"MATERIAL"})
	require.NoError(t, err)
	require.Equal(t, 34.0, aggregate[materialID].ReservedQty, "aggregate retains reservation-only batches")
	require.Equal(t, 70.0, aggregate[materialID].AvailableQty)
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions([]string{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView}, "reader", "GET", "/documents/"+detail.Document.ID+"/warehouse-review", "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var emptyReview services.ProductionMaterialIssuanceWarehouseReview
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &emptyReview))
	require.NotNil(t, emptyReview.ReturnableAllocations, "untouched documents must serialize an empty array, not null")
	require.Empty(t, emptyReview.ReturnableAllocations)
	var movementCount int64
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceWarehouseMovement{}).Count(&movementCount).Error)
	require.Zero(t, movementCount)
}

func TestProductionMaterialIssuanceVersionedBatchQueryRejectsStaleForeignMalformedAndUnauthorizedRequests(t *testing.T) {
	_, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	endpoint := "/documents/" + detail.Document.ID + "/material-batches"
	permissions := []string{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView}
	for _, test := range []struct {
		body     string
		expected int
	}{
		{`{"expectedVersion":2,"materialId":"` + detail.Sources[0].Contributions[0].MaterialID + `"}`, http.StatusConflict},
		{`{"expectedVersion":1,"materialId":"` + uuid.NewString() + `"}`, http.StatusUnprocessableEntity},
		{`{"expectedVersion":1,"materialId":"bad-id"}`, http.StatusBadRequest},
		{`{"expectedVersion":1,"materialId":"` + detail.Sources[0].Contributions[0].MaterialID + `","quantity":1}`, http.StatusBadRequest},
	} {
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader", "POST", endpoint, test.body)
		require.Equal(t, test.expected, response.Code, response.Body.String())
	}
	for _, forbidden := range [][]string{nil, {authz.MenuWarehouse}, {authz.ActionProductionMaterialIssuanceView}} {
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(forbidden, "reader", "POST", endpoint, `{}`)
		require.Equal(t, http.StatusForbidden, response.Code)
	}
}

func TestProductionMaterialIssuanceSharedBatchQueryRejectsDuplicateBalancesAndInvalidReservations(t *testing.T) {
	for _, corruption := range []string{"duplicate-balance", "negative-reservation"} {
		t.Run(corruption, func(t *testing.T) {
			database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
			materialID := detail.Sources[0].Contributions[0].MaterialID
			if corruption == "duplicate-balance" {
				require.NoError(t, database.Create(&models.Inventory{BaseModel: models.BaseModel{ID: uuid.NewString()}, MaterialID: materialID, CategoryCode: "MATERIAL", BatchNo: "batch-A", UOM: "kg", Quantity: 5}).Error)
			} else {
				require.NoError(t, database.Exec(`INSERT INTO inventory_reservations (id,material_id,category_code,batch_no,quantity,status) VALUES (?,?,?,?,?,?)`, uuid.NewString(), materialID, "MATERIAL", "batch-A", -1, "RESERVED").Error)
			}
			_, batchError := services.QueryMaterialInventoryBatchAvailability(database, []string{materialID}, []string{"MATERIAL"})
			_, aggregateError := services.QueryMaterialInventoryAvailability(database, []string{materialID}, []string{"MATERIAL"})
			require.Error(t, batchError)
			require.Error(t, aggregateError)
		})
	}
}

func TestProductionMaterialIssuanceWarehouseReviewProjectsRemainingOriginalAllocationAfterReturn(t *testing.T) {
	_, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	permissions := productionMaterialIssuanceWarehouseHTTPAllConfirmationPermissions()
	base := "/documents/" + detail.Document.ID
	issue := buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail, 1, 10)
	response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse", "POST", base+"/issue", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, issue))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var issued services.ProductionMaterialIssuanceWarehouseConfirmationResult
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &issued))
	originalID := issued.Movement.Materials[0].Allocations[0].ID
	returned := buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail, 2, 3)
	materials := returned["materials"].([]services.ProductionMaterialIssuanceWarehouseMaterialInput)
	materials[0].Allocations[0].OriginalAllocationID = &originalID
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse", "POST", base+"/return", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, returned))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse", "GET", base+"/warehouse-review", "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var review services.ProductionMaterialIssuanceWarehouseReview
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &review))
	require.Len(t, review.ReturnableAllocations, 1)
	require.Equal(t, originalID, review.ReturnableAllocations[0].OriginalAllocationID)
	require.Equal(t, 7.0, review.ReturnableAllocations[0].ReturnableQty)
	require.Equal(t, 7.0, review.SourceMaterials[0].NetQty)
	remainingReturn := buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail, 3, 7)
	remainingReturn["materials"].([]services.ProductionMaterialIssuanceWarehouseMaterialInput)[0].Allocations[0].OriginalAllocationID = &originalID
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse", "POST", base+"/return", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, remainingReturn))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse", "GET", base+"/warehouse-review", "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var fullyReturnedReview services.ProductionMaterialIssuanceWarehouseReview
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &fullyReturnedReview))
	require.NotNil(t, fullyReturnedReview.ReturnableAllocations, "fully returned documents also retain the required array")
	require.Empty(t, fullyReturnedReview.ReturnableAllocations)
	require.Zero(t, fullyReturnedReview.SourceMaterials[0].NetQty)
}

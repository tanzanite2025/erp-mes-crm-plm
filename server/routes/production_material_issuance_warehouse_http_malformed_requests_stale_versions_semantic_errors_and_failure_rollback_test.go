package routes

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func requireProductionMaterialIssuanceWarehouseHTTPFailureLeavesOriginalInventoryAndNoMovement(t *testing.T, database *gorm.DB, documentID string) {
	t.Helper()
	for model, expected := range map[any]int64{
		&models.ProductionMaterialIssuanceWarehouseMovement{}:         0,
		&models.ProductionMaterialIssuanceWarehouseMovementMaterial{}: 0,
		&models.ProductionMaterialIssuanceOrderLineAllocation{}:       0,
		&models.InventoryLedgerEntry{}:                                0,
		&models.ProductionMaterialIssuanceCommandReceipt{}:            1,
	} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Equal(t, expected, count, "%T", model)
	}
	var document models.ProductionMaterialIssuanceDocument
	require.NoError(t, database.First(&document, "id = ?", documentID).Error)
	require.Equal(t, 1, document.Version)
	require.Nil(t, document.WarehouseExecutionAt)
	var balances []models.Inventory
	require.NoError(t, database.Find(&balances).Error)
	require.Len(t, balances, 1)
	require.Equal(t, "MATERIAL", balances[0].CategoryCode)
	require.Equal(t, 100.0, balances[0].Quantity)
	require.Equal(t, 500.0, balances[0].TotalValue)
}

func TestProductionMaterialIssuanceWarehouseHTTPRejectsForgedIdentityMalformedBodiesAndUnknownFields(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	permissions := productionMaterialIssuanceWarehouseHTTPAllConfirmationPermissions()
	base := "/documents/" + detail.Document.ID
	body := buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail, 1, 10)
	valid := marshalProductionMaterialIssuanceHTTPCommandTestBody(t, body)
	invalidBodies := []string{`{}`, `null`, `[]`, valid + `{}`, strings.Repeat(" ", 256*1024) + valid,
		strings.Replace(valid, body["commandId"].(string), "invalid-uuid", 1),
		strings.Replace(valid, detail.Sources[0].Contributions[0].MaterialID, "invalid-material", 1),
		strings.Replace(valid, `"quantity":10`, `"quantity":1e999`, 1),
		strings.Replace(valid, `"quantity":10`, `"quantity":"10"`, 1),
		strings.Replace(valid, `"salesOrderLineId":101`, `"salesOrderLineId":0`, 1),
		strings.Replace(valid, `"originalAllocationId":null`, `"originalAllocationId":"invalid-original"`, 1),
	}
	for _, injected := range []string{
		`"documentId":"` + uuid.NewString() + `",`,
		`"kind":"SUPPLEMENT",`, `"actorId":"forged",`, `"confirmedBy":"forged",`,
		`"sourceCategory":"FINISHED",`, `"targetCategory":"MATERIAL",`,
	} {
		invalidBodies = append(invalidBodies, "{"+injected+valid[1:])
	}
	for _, invalid := range invalidBodies {
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", base+"/issue", invalid)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
		require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_INVALID_REQUEST")
		require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
	}
	for _, endpoint := range []string{"/documents/not-a-uuid/issue", base + "/issue?kind=SUPPLEMENT", base + "/issue?expectedVersion=1&expectedVersion=2"} {
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", endpoint, valid)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", "/documents/"+uuid.NewString()+"/issue", valid)
	require.Equal(t, http.StatusNotFound, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_NOT_FOUND")
	requireProductionMaterialIssuanceWarehouseHTTPFailureLeavesOriginalInventoryAndNoMovement(t, database, detail.Document.ID)
}

func TestProductionMaterialIssuanceWarehouseHTTPSemanticErrorsHaveStableCodesAndNeverPartiallyPost(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	permissions := productionMaterialIssuanceWarehouseHTTPAllConfirmationPermissions()
	for _, testCase := range []struct {
		name, action, code string
		status             int
		modify             func(map[string]any)
	}{
		{"stale-version", "issue", "PRODUCTION_MATERIAL_ISSUANCE_BASIS_CHANGED", 409, func(body map[string]any) { body["expectedVersion"] = 2 }},
		{"allocation-sum", "issue", "PRODUCTION_MATERIAL_ISSUANCE_ALLOCATION_INVALID", 422, func(body map[string]any) {
			body["materials"].([]services.ProductionMaterialIssuanceWarehouseMaterialInput)[0].Quantity = 9
		}},
		{"ordinary-over-standard", "issue", "PRODUCTION_MATERIAL_ISSUANCE_ALLOCATION_INVALID", 422, func(body map[string]any) {
			material := &body["materials"].([]services.ProductionMaterialIssuanceWarehouseMaterialInput)[0]
			material.Quantity, material.Allocations[0].Quantity = 51, 51
		}},
		{"supplement-without-reason", "supplement", "PRODUCTION_MATERIAL_ISSUANCE_INVALID_REQUEST", 400, func(body map[string]any) { body["reason"] = " " }},
		{"return-without-original", "return", "PRODUCTION_MATERIAL_ISSUANCE_INVALID_REQUEST", 400, func(body map[string]any) {}},
		{"return-with-unknown-original", "return", "PRODUCTION_MATERIAL_ISSUANCE_ALLOCATION_INVALID", 422, func(body map[string]any) {
			original := uuid.NewString()
			body["materials"].([]services.ProductionMaterialIssuanceWarehouseMaterialInput)[0].Allocations[0].OriginalAllocationID = &original
		}},
		{"wrong-batch", "issue", "PRODUCTION_MATERIAL_ISSUANCE_STOCK_UNAVAILABLE", 409, func(body map[string]any) {
			body["materials"].([]services.ProductionMaterialIssuanceWarehouseMaterialInput)[0].BatchNo = "missing-batch"
		}},
		{"supplement-over-stock", "supplement", "PRODUCTION_MATERIAL_ISSUANCE_STOCK_UNAVAILABLE", 409, func(body map[string]any) {
			material := &body["materials"].([]services.ProductionMaterialIssuanceWarehouseMaterialInput)[0]
			material.Quantity, material.Allocations[0].Quantity = 101, 101
		}},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			body := buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail, 1, 10)
			testCase.modify(body)
			response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", "/documents/"+detail.Document.ID+"/"+testCase.action, marshalProductionMaterialIssuanceHTTPCommandTestBody(t, body))
			require.Equal(t, testCase.status, response.Code, response.Body.String())
			require.Contains(t, response.Body.String(), testCase.code)
			requireProductionMaterialIssuanceWarehouseHTTPFailureLeavesOriginalInventoryAndNoMovement(t, database, detail.Document.ID)
		})
	}
}

func TestProductionMaterialIssuanceWarehouseHTTPReviewSuggestionValidatesVersionsAndDoesNotMaskCorruption(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	permissions := productionMaterialIssuanceWarehouseHTTPAllConfirmationPermissions()
	base := "/documents/" + detail.Document.ID
	suggestion := map[string]any{"expectedVersion": 1, "materialId": detail.Sources[0].Contributions[0].MaterialID, "quantity": 12}
	valid := marshalProductionMaterialIssuanceHTTPCommandTestBody(t, suggestion)
	for _, invalid := range []string{`null`, `{}`, valid + `{}`, `{"documentId":"forged",` + valid[1:], strings.Replace(valid, `"expectedVersion":1`, `"expectedVersion":0`, 1)} {
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader-1", "POST", base+"/ordinary-allocation-suggestion", invalid)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	for _, testCase := range []struct {
		field  string
		value  any
		status int
		code   string
	}{{"expectedVersion", 2, 409, "PRODUCTION_MATERIAL_ISSUANCE_BASIS_CHANGED"}, {"quantity", 51, 422, "PRODUCTION_MATERIAL_ISSUANCE_ALLOCATION_INVALID"}} {
		body := map[string]any{"expectedVersion": 1, "materialId": suggestion["materialId"], "quantity": 12}
		body[testCase.field] = testCase.value
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader-1", "POST", base+"/ordinary-allocation-suggestion", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, body))
		require.Equal(t, testCase.status, response.Code, response.Body.String())
		require.Contains(t, response.Body.String(), testCase.code)
	}
	for _, endpoint := range []string{base + "/warehouse-review?unexpected=1", "/documents/not-a-uuid/warehouse-review"} {
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader-1", "GET", endpoint, "")
		require.Equal(t, http.StatusBadRequest, response.Code)
	}
	response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader-1", "GET", "/documents/"+uuid.NewString()+"/warehouse-review", "")
	require.Equal(t, http.StatusNotFound, response.Code)
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceSourceSnapshot{}).Where("document_id = ?", detail.Document.ID).Update("snapshot", json.RawMessage(`{}`)).Error)
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader-1", "GET", base+"/warehouse-review", "")
	require.Equal(t, http.StatusInternalServerError, response.Code)
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_QUERY_FAILED")
	require.NotContains(t, response.Body.String(), "snapshot")
	require.NotContains(t, response.Body.String(), "SELECT")
	requireProductionMaterialIssuanceWarehouseHTTPFailureLeavesOriginalInventoryAndNoMovement(t, database, detail.Document.ID)
}

func TestProductionMaterialIssuanceWarehouseHTTPAuditFailureRollsBackInventoryAllocationsVersionAndReceipt(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	permissions := productionMaterialIssuanceWarehouseHTTPAllConfirmationPermissions()
	body := buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail, 1, 10)
	require.NoError(t, database.Migrator().DropTable(&models.AuditLog{}))
	response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", "/documents/"+detail.Document.ID+"/issue", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, body))
	require.Equal(t, http.StatusInternalServerError, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_COMMAND_FAILED")
	require.NotContains(t, response.Body.String(), "audit_logs")
	require.NotContains(t, response.Body.String(), "INSERT")
	requireProductionMaterialIssuanceWarehouseHTTPFailureLeavesOriginalInventoryAndNoMovement(t, database, detail.Document.ID)
}

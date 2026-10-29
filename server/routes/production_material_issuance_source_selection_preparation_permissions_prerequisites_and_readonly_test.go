package routes

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionMaterialIssuanceSourceSelectionWorksWithoutSalesPermissionAndReadsOnlySelectedSources(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	permissions := []string{authz.TabMrpProductionMaterialIssuance, authz.ActionProductionMaterialIssuanceView}
	response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/source-options?search=SO-HTTP&page=1&pageSize=1", "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var options services.ProductionMaterialIssuanceSourceOptions
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &options))
	require.EqualValues(t, 1, options.Total)
	require.Len(t, options.Items, 1)
	require.Equal(t, source.SalesOrderID, options.Items[0].SalesOrderID)
	require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/source-options?search=unmatched", "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), `"items":[]`)
	require.NoError(t, database.Create(&models.SalesOrderLine{ID: 102, SalesOrderID: source.SalesOrderID, LineNo: 2, ProductID: uuid.NewString(), ProductModel: "OTHER", Qty: 200, UOM: "PCS"}).Error)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/source-options?page=2&pageSize=1", "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var secondPage services.ProductionMaterialIssuanceSourceOptions
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &secondPage))
	require.EqualValues(t, 2, secondPage.Total)
	require.EqualValues(t, 102, secondPage.Items[0].SalesOrderLineID)
	raw, err := json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourcePreparationSelection{{SalesOrderID: source.SalesOrderID, SalesOrderLineID: source.SalesOrderLineID}}})
	require.NoError(t, err)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "POST", "/source-preparation", string(raw))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var prepared services.ProductionMaterialIssuanceSourcePreparation
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &prepared))
	require.True(t, prepared.IsReady)
	require.Len(t, prepared.SourceLines, 1)
	require.Equal(t, source.BOMID, prepared.SourceLines[0].BOM.ID)
	require.Equal(t, 50.0, prepared.SourceLines[0].Contributions[0].RequiredQty)
	for _, model := range []any{&models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceCommandReceipt{}, &models.AuditLog{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Zero(t, count)
	}
}

func TestProductionMaterialIssuanceSourcePreparationReportsMissingAmbiguousWeightUnitAndVersionPrerequisites(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	permissions := []string{authz.TabMrpProductionMaterialIssuance, authz.ActionProductionMaterialIssuanceView}
	raw, err := json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourcePreparationSelection{{SalesOrderID: source.SalesOrderID, SalesOrderLineID: source.SalesOrderLineID}}})
	require.NoError(t, err)
	for _, scenario := range []struct{ sql, code string }{
		{"UPDATE boms SET status='DRAFT'", "MISSING_BOM"},
		{"UPDATE boms SET status='RELEASED', measured_weight=0", "INVALID_FINISHED_WEIGHT"},
		{"UPDATE boms SET measured_weight=420; UPDATE sales_order_lines SET uom=''", "MISSING_FINISHED_UNIT"},
		{"UPDATE sales_order_lines SET uom='PCS'; UPDATE sales_orders SET version=0", "INVALID_SOURCE_VERSION"},
	} {
		for _, statement := range strings.Split(scenario.sql, ";") {
			require.NoError(t, database.Exec(statement).Error)
		}
		response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "POST", "/source-preparation", string(raw))
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		require.Contains(t, response.Body.String(), `"isReady":false`)
		require.Contains(t, response.Body.String(), scenario.code)
	}
	require.NoError(t, database.Exec("UPDATE sales_orders SET version=4").Error)
	require.NoError(t, database.Exec("INSERT INTO boms SELECT ?, product_id, bom_type, 'SECOND', status, owner_type, owner_customer_id, version, version_text, version_level, revision_no, measured_weight, measured_weight_unit, effective_from, effective_to, deleted_at FROM boms", uuid.NewString()).Error)
	response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "POST", "/source-preparation", string(raw))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "BOM_SELECTION_REQUIRED")
	withBOM, err := json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourceSelection{source}})
	require.NoError(t, err)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "POST", "/source-preparation", string(withBOM))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), `"isReady":true`)
	require.NoError(t, database.Exec("DELETE FROM products").Error)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "POST", "/source-preparation", string(withBOM))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), "MISSING_PRODUCT")
}

func TestProductionMaterialIssuanceWarehouseReviewReportsUnavailableCustodyBeforeConfirmation(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	require.NoError(t, database.Exec("UPDATE warehouse_categories SET allow_inbound=FALSE WHERE code=?", models.ProductionMaterialPendingConsumptionWarehouseCategoryCode).Error)
	permissions := []string{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView}
	response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader", "GET", "/documents/"+detail.Document.ID+"/warehouse-review", "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var review services.ProductionMaterialIssuanceWarehouseReview
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &review))
	require.NotEmpty(t, review.WarehouseActionBlockers["issue"])
	require.NotEmpty(t, review.WarehouseActionBlockers["supplement"])
	require.Empty(t, review.WarehouseActionBlockers["return"])
	var count int64
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceWarehouseMovement{}).Count(&count).Error)
	require.Zero(t, count)
}

func TestProductionMaterialIssuanceSourcePreparationRejectsUnauthorizedMalformedAndForeignOrCoveredSources(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	for _, permissions := range [][]string{nil, {authz.MenuMrp}, {authz.ActionProductionMaterialIssuanceView}, {authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView}} {
		for _, route := range []struct{ method, path string }{{"GET", "/source-options"}, {"POST", "/source-preparation"}} {
			response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", route.method, route.path, `{}`)
			require.Equal(t, http.StatusForbidden, response.Code)
		}
	}
	permissions := []string{authz.TabMrpProductionMaterialIssuance, authz.ActionProductionMaterialIssuanceView}
	for _, query := range []string{"?page=0", "?pageSize=101", "?page=1&page=2", "?warehouse=other", "?page=9223372036854775807&pageSize=100"} {
		response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/source-options"+query, "")
		require.Equal(t, http.StatusBadRequest, response.Code)
	}
	for _, body := range []string{`{}`, `null`, `{"sources":[]}`, `{"sources":[],"actorId":"forged"}`, `{"sources":[{"salesOrderId":"bad","salesOrderLineId":101}]}`} {
		response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "POST", "/source-preparation", body)
		require.Equal(t, http.StatusBadRequest, response.Code)
	}
	raw, err := json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourceSelection{source, source}})
	require.NoError(t, err)
	response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "POST", "/source-preparation", string(raw))
	require.Equal(t, http.StatusBadRequest, response.Code)
	foreignSource := source
	foreignSource.SalesOrderID = uuid.NewString()
	raw, err = json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourceSelection{foreignSource}})
	require.NoError(t, err)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "POST", "/source-preparation", string(raw))
	require.Equal(t, http.StatusConflict, response.Code)
	bases, err := services.ReviewProductionMaterialIssuanceSources(context.Background(), database, []services.ProductionMaterialIssuanceSourceSelection{source})
	require.NoError(t, err)
	detail, err := services.DispatchProductionMaterialIssuanceDocument(context.Background(), database, services.ProductionMaterialIssuanceCommandActor{UserID: "dispatcher"}, services.ProductionMaterialIssuanceDispatchRequest{CommandID: "prepare-coverage-test", Sources: []services.ProductionMaterialIssuanceDispatchSourceExpectation{{ProductionMaterialIssuanceSourceSelection: source, ExpectedOrderVersion: bases[0].OrderVersion, ExpectedBOMVersion: bases[0].BOM.Version, BasisFingerprint: bases[0].BasisFingerprint}}})
	require.NoError(t, err)
	raw, err = json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourceSelection{source}})
	require.NoError(t, err)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "POST", "/source-preparation", string(raw))
	require.Equal(t, http.StatusConflict, response.Code)
	require.Contains(t, response.Body.String(), "SOURCE_COVERED")
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/source-options", "")
	require.Contains(t, response.Body.String(), detail.Document.ID)
	require.NoError(t, database.Exec("UPDATE sales_orders SET status='Closed'").Error)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/source-options", "")
	require.Contains(t, response.Body.String(), `"total":0`)
}

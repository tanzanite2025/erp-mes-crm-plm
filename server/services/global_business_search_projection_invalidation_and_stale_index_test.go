package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
	"xdfc-server/authz"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestGlobalBusinessSearchProjectionToleratesInvalidPartnerReferencesAndNormalizesUUIDs(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	customerID, supplierID := uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO customers (id, code, name) VALUES (?, 'CUSTOMER-CURRENT', '当前客户名')`, customerID).Error)
	require.NoError(t, database.Exec(`INSERT INTO suppliers (id, code, name) VALUES (?, 'SUPPLIER-CURRENT', '当前供应商名')`, supplierID).Error)
	for _, scenario := range []struct{ table, referenceColumn, referenceID, snapshotColumn, category string }{
		{"sales_orders", "customer_id", customerID, "customer_name", "sales-order"},
		{"purchase_orders", "supplier_id", supplierID, "supplier_name", "purchase-order"},
	} {
		t.Run(scenario.category, func(t *testing.T) {
			for index, reference := range []string{"legacy-partner", "undefined", "", strings.ToUpper(scenario.referenceID)} {
				require.NoError(t, database.Exec("INSERT INTO "+scenario.table+" (id, order_no, "+scenario.referenceColumn+", "+scenario.snapshotColumn+") VALUES (?, ?, ?, '历史伙伴名称')", uuid.NewString(), fmt.Sprintf("ORDER-%d", index), reference).Error)
			}
			for _, source := range globalBusinessSearchSources {
				if source.category != scenario.category {
					continue
				}
				documents, err := loadGlobalBusinessSearchSourceDocuments(context.Background(), database, source, "", nil, 250)
				require.NoError(t, err, "one malformed varchar reference must not fail a complete snapshot")
				require.Len(t, documents, 4)
				for _, document := range documents {
					require.Contains(t, document.Model, "历史伙伴名称")
					if document.Code == "ORDER-3" {
						require.Contains(t, document.Model, "-CURRENT", "UUID case variants must resolve the current partner")
					} else {
						require.NotContains(t, document.Model, "-CURRENT")
					}
				}
			}
		})
	}
}

func TestGlobalBusinessSearchProjectionIncludesRelatedFieldsAndDeclarativeUserScope(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	customerID, orderID, requesterID := uuid.NewString(), uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO customers (id, code, name) VALUES (?, 'CUST-77', '客户当前名称')`, customerID).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_orders (id, order_no, customer_id) VALUES (?, 'SO-77', ?)`, orderID, customerID).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_order_lines (sales_order_id, product_code, customer_part_no) VALUES (?, 'SKU-77', '客户料号-009')`, orderID).Error)
	require.NoError(t, database.Exec(`INSERT INTO approval_requests (id, reason, requester_id) VALUES (?, '本人审批', ?)`, uuid.NewString(), requesterID).Error)
	for _, source := range globalBusinessSearchSources {
		documents, err := loadGlobalBusinessSearchSourceDocuments(context.Background(), database, source, "", nil, 250)
		require.NoError(t, err)
		if source.category == "sales-order" {
			require.Len(t, documents, 1)
			require.True(t, globalBusinessSearchDocumentContainsKeywords(documents[0], "sku-77 客户当前 客户料号-009"))
		}
		if source.category == "approval-request" {
			require.Len(t, documents, 1)
			require.True(t, documents[0].RestrictedToUsers)
			require.True(t, globalBusinessSearchDocumentMatchesLiveScope(documents[0], requesterID, false))
			require.False(t, globalBusinessSearchDocumentMatchesLiveScope(documents[0], uuid.NewString(), false))
		}
	}
}

func TestGlobalBusinessSearchInvalidatesSourceAndRelationTablesWithoutPerServiceHooks(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	refreshRequests := make(chan struct{}, 1)
	require.NoError(t, registerGlobalBusinessSearchTableInvalidation(database, refreshRequests))
	for _, table := range []string{"materials", "customers", "sales_order_lines", "sales_return_lines", "sales_return_line_barcodes", "sales_exchange_lines", "sales_exchange_label_codes"} {
		record := map[string]any{"id": uuid.NewString()}
		switch table {
		case "sales_order_lines":
			record = map[string]any{"sales_order_id": uuid.NewString(), "product_code": "LINE-77"}
		case "sales_return_lines", "sales_return_line_barcodes":
			record = map[string]any{"sales_return_id": uuid.NewString()}
		case "sales_exchange_lines", "sales_exchange_label_codes":
			record = map[string]any{"sales_exchange_id": uuid.NewString()}
		}
		require.NoError(t, database.Table(table).Create(record).Error)
		select {
		case <-refreshRequests:
		default:
			t.Fatalf("%s did not invalidate the shared search snapshot", table)
		}
	}
	require.NoError(t, database.Table("materials").Where("1 = 1").Update("name", "改名").Error)
	require.Len(t, refreshRequests, 1)
	<-refreshRequests
	require.NoError(t, database.Table("materials").Where("1 = 1").Delete(map[string]any{}).Error)
	require.Len(t, refreshRequests, 1)
}

func TestGlobalBusinessSearchSnapshotFailureAbortsInsteadOfPublishingPartialResults(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	require.NoError(t, database.Exec(`INSERT INTO materials (id, code, name) VALUES (?, 'MAT-77', '材料')`, uuid.NewString()).Error)
	aborted, batchReceived := false, false
	engine := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/v1/index/snapshot/start":
			_, _ = response.Write([]byte(`{"token":"test-token"}`))
		case "/v1/index/snapshot/test-token/batch":
			var documents []SearchDocument
			require.NoError(t, json.NewDecoder(request.Body).Decode(&documents))
			require.Len(t, documents, 1)
			require.Equal(t, "material", documents[0].Category)
			batchReceived = true
		case "/v1/index/snapshot/test-token/publish":
			response.WriteHeader(http.StatusServiceUnavailable)
		case "/v1/index/snapshot/test-token/abort":
			aborted = true
		default:
			t.Errorf("unexpected index endpoint %s", request.URL.Path)
		}
	}))
	defer engine.Close()
	_, err := RebuildGlobalBusinessSearchSnapshot(context.Background(), database, &SearchServiceClient{BaseURL: engine.URL, HTTPClient: engine.Client()})
	require.Error(t, err)
	require.True(t, batchReceived)
	require.True(t, aborted)
}

func TestGlobalBusinessSearchHydratesPastStalePagesAndRejectsReassignedApprovals(t *testing.T) {
	endpoint := os.Getenv("GLOBAL_SEARCH_TEST_RUST_URL")
	if endpoint == "" {
		t.Skip("set GLOBAL_SEARCH_TEST_RUST_URL for the actual Rust integration")
	}
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	client := &SearchServiceClient{BaseURL: endpoint, HTTPClient: &http.Client{Timeout: 5 * time.Second}}
	searchContext, cancelSearch := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelSearch()
	for index := 0; index < 530; index++ {
		require.NoError(t, database.Exec(`INSERT INTO materials (id, code, name) VALUES (?, 'SEARCH', ?)`, uuid.NewString(), fmt.Sprintf("a%03d", index)).Error)
	}
	ownerID, approvalID := uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO approval_requests (id, target_id, reason, requester_id) VALUES (?, 'SEARCH', '审批', ?)`, approvalID, ownerID).Error)
	total, err := RebuildGlobalBusinessSearchSnapshot(searchContext, database, client)
	require.NoError(t, err)
	require.Equal(t, 531, total) // Crosses multiple keyset/index batches.
	require.NoError(t, database.Exec(`UPDATE materials SET deleted_at = CURRENT_TIMESTAMP WHERE name < 'a501'`).Error)
	require.NoError(t, database.Exec(`UPDATE approval_requests SET requester_id = ? WHERE id = ?`, uuid.NewString(), approvalID).Error)
	firstPage, err := SearchGlobalBusinessRecords(searchContext, database, client, "SEARCH", ownerID, []string{authz.MenuWarehouse}, false, 10, 0, "")
	require.NoError(t, err)
	require.Len(t, firstPage.Data, 10)
	require.True(t, firstPage.HasMore)
	require.Equal(t, "a501", firstPage.Data[0].Title)
	require.Equal(t, 511, firstPage.NextOffset)
	secondPage, err := SearchGlobalBusinessRecords(searchContext, database, client, "SEARCH", ownerID, []string{authz.MenuWarehouse}, false, 30, firstPage.NextOffset, firstPage.Generation)
	require.NoError(t, err)
	require.Len(t, secondPage.Data, 19)
	require.False(t, secondPage.HasMore)
	require.Equal(t, "a511", secondPage.Data[0].Title)
	approvalPage, err := SearchGlobalBusinessRecords(searchContext, database, client, "SEARCH", ownerID, []string{authz.MenuApproval}, false, 30, 0, "")
	require.NoError(t, err)
	require.Empty(t, approvalPage.Data)
	_, err = SearchGlobalBusinessRecords(searchContext, database, nil, "SEARCH", ownerID, []string{authz.MenuWarehouse}, false, 30, 0, "")
	require.Error(t, err, "an unavailable sidecar must not masquerade as an empty result")
}

func TestGlobalBusinessSearchRejectsSnapshotChangesWhileHydratingStalePages(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	requests := 0
	engine := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		var searchRequest GlobalBusinessSearchEngineRequest
		require.NoError(t, json.NewDecoder(request.Body).Decode(&searchRequest))
		requests++
		if requests == 1 {
			require.Empty(t, searchRequest.Generation)
			require.NoError(t, json.NewEncoder(response).Encode(SearchResponse{Items: []GlobalBusinessSearchEngineHit{{ID: uuid.NewString(), Category: "material"}}, HasMore: true, Generation: "first-snapshot"}))
			return
		}
		require.Equal(t, "first-snapshot", searchRequest.Generation)
		response.WriteHeader(http.StatusConflict)
	}))
	defer engine.Close()
	_, err := SearchGlobalBusinessRecords(context.Background(), database, &SearchServiceClient{BaseURL: engine.URL, HTTPClient: engine.Client()}, "SEARCH", uuid.NewString(), []string{authz.MenuWarehouse}, false, 30, 0, "")
	require.ErrorIs(t, err, ErrGlobalBusinessSearchSnapshotChanged)
	require.Equal(t, 2, requests)
}

func TestGlobalBusinessSearchPreservesPaginationForIdenticalSnapshotsAndRejectsChangedContent(t *testing.T) {
	endpoint := os.Getenv("GLOBAL_SEARCH_TEST_RUST_URL")
	if endpoint == "" {
		t.Skip("set GLOBAL_SEARCH_TEST_RUST_URL for the actual Rust integration")
	}
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	client := &SearchServiceClient{BaseURL: endpoint, HTTPClient: &http.Client{Timeout: 5 * time.Second}}
	for _, code := range []string{"SEARCH-A", "SEARCH-B"} {
		require.NoError(t, database.Exec(`INSERT INTO materials (id, code, name) VALUES (?, ?, '材料')`, uuid.NewString(), code).Error)
	}
	_, err := RebuildGlobalBusinessSearchSnapshot(context.Background(), database, client)
	require.NoError(t, err)
	firstPage, err := SearchGlobalBusinessRecords(context.Background(), database, client, "SEARCH", uuid.NewString(), []string{authz.MenuWarehouse}, false, 1, 0, "")
	require.NoError(t, err)
	require.True(t, firstPage.HasMore)
	_, err = RebuildGlobalBusinessSearchSnapshot(context.Background(), database, client)
	require.NoError(t, err)
	secondPage, err := SearchGlobalBusinessRecords(context.Background(), database, client, "SEARCH", uuid.NewString(), []string{authz.MenuWarehouse}, false, 1, firstPage.NextOffset, firstPage.Generation)
	require.NoError(t, err, "periodic rebuilding of unchanged data must not invalidate pagination")
	require.Equal(t, firstPage.Generation, secondPage.Generation)
	require.NotEqual(t, firstPage.Data[0].ID, secondPage.Data[0].ID)
	require.NoError(t, database.Exec(`UPDATE materials SET name = '新名称' WHERE code = 'SEARCH-A'`).Error)
	_, err = RebuildGlobalBusinessSearchSnapshot(context.Background(), database, client)
	require.NoError(t, err)
	_, err = SearchGlobalBusinessRecords(context.Background(), database, client, "SEARCH", uuid.NewString(), []string{authz.MenuWarehouse}, false, 1, firstPage.NextOffset, firstPage.Generation)
	require.ErrorIs(t, err, ErrGlobalBusinessSearchSnapshotChanged)
}

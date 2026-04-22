package handlers

import (
	"testing"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/stretchr/testify/require"
)

func TestNormalizeGlobalSearchHref_RewritesRetiredSystemRoutingEntry(t *testing.T) {
	require.Equal(
		t,
		"/approval/routing",
		normalizeGlobalSearchHref("/system-management/routing"),
	)
}

func TestNormalizeGlobalSearchHref_LeavesOtherRoutesUntouched(t *testing.T) {
	require.Equal(t, "/inventory", normalizeGlobalSearchHref("/inventory"))
	require.Equal(t, "/approval", normalizeGlobalSearchHref("/approval"))
}

func TestNewGlobalSearchItemResponse_UsesCategoryMetaCatalog(t *testing.T) {
	item := newGlobalSearchItemResponse(
		"order-1",
		"Road Bike Order",
		"SO-001",
		services.SearchCategorySalesOrder,
		0.98,
	)

	require.Equal(t, "order-1", item.ID)
	require.Equal(t, "Road Bike Order", item.Title)
	require.Equal(t, "SO-001", item.Code)
	require.Equal(t, services.SearchCategorySalesOrder, item.Category)
	require.Equal(t, "/trading/sales-orders", item.Href)
	require.Equal(t, "销售订单 / Sales Orders", item.ParentTitle)
	require.Equal(t, float32(0.98), item.Score)
}

func TestMapSalesOrderToGlobalSearchItem_BuildsDetailHref(t *testing.T) {
	item := mapSalesOrderToGlobalSearchItem(
		models.SalesOrder{
			ID:           "order-1",
			OrderNo:      "SO-001",
			OrderName:    "Road Bike Order",
			CustomerName: "Acme",
		},
		0.91,
	)

	require.Equal(t, "Road Bike Order", item.Title)
	require.Equal(t, "SO-001", item.Code)
	require.Equal(t, "/trading/sales-orders?detailId=order-1&search=SO-001", item.Href)
}

func TestMapApprovalRequestToGlobalSearchItem_BuildsRequestHref(t *testing.T) {
	item := mapApprovalRequestToGlobalSearchItem(
		models.ApprovalRequest{
			BaseModel: models.BaseModel{ID: "approval-1"},
			TargetID:  "order-1",
			Reason:    "Approval pending",
			Module:    "Sales",
			Action:    "ORDER_APPROVAL",
		},
		0.83,
	)

	require.Equal(t, "Approval pending", item.Title)
	require.Equal(t, "order-1", item.Code)
	require.Equal(t, "/approval/requests?requestId=approval-1", item.Href)
}

func TestMapPurchaseOrderToGlobalSearchItem_BuildsDetailHref(t *testing.T) {
	item := mapPurchaseOrderToGlobalSearchItem(
		models.PurchaseOrder{
			ID:           "purchase-1",
			OrderNo:      "PO-001",
			SupplierName: "Bright Supplier",
		},
		0.87,
	)

	require.Equal(t, "Bright Supplier", item.Title)
	require.Equal(t, "PO-001", item.Code)
	require.Equal(t, "/purchase/orders?detailId=purchase-1&search=PO-001", item.Href)
}

func TestMapSupplierToGlobalSearchItem_BuildsDetailHref(t *testing.T) {
	item := mapSupplierToGlobalSearchItem(
		models.Supplier{
			ID:   "supplier-1",
			Code: "SUP-001",
			Name: "Bright Supplier",
		},
		0.86,
	)

	require.Equal(t, "Bright Supplier", item.Title)
	require.Equal(t, "SUP-001", item.Code)
	require.Equal(t, "/purchase/suppliers?detailId=supplier-1&search=SUP-001", item.Href)
}

func TestMapGlobalSearchMatches_PreservesSearchOrderAcrossCategories(t *testing.T) {
	results := mapGlobalSearchMatches(
		[]globalSearchMatch{
			{ID: "approval-1", Category: services.SearchCategoryApprovalRequest, Score: 0.95},
			{ID: "purchase-1", Category: services.SearchCategoryPurchaseOrder, Score: 0.93},
			{ID: "supplier-1", Category: services.SearchCategorySupplier, Score: 0.92},
			{ID: "order-1", Category: services.SearchCategorySalesOrder, Score: 0.91},
			{ID: "inv-1", Category: services.SearchCategoryInventory, Score: 0.88},
			{ID: "missing", Category: services.SearchCategorySalesOrder, Score: 0.80},
		},
		map[string]models.Inventory{
			"inv-1": {
				BaseModel:    models.BaseModel{ID: "inv-1"},
				MaterialName: "Nickel Plate",
				MaterialCode: "MAT-001",
			},
		},
		map[string]models.SalesOrder{
			"order-1": {
				ID:        "order-1",
				OrderNo:   "SO-001",
				OrderName: "Road Bike Order",
			},
		},
		map[string]models.PurchaseOrder{
			"purchase-1": {
				ID:           "purchase-1",
				OrderNo:      "PO-001",
				SupplierName: "Bright Supplier",
			},
		},
		map[string]models.Supplier{
			"supplier-1": {
				ID:   "supplier-1",
				Code: "SUP-001",
				Name: "Bright Supplier",
			},
		},
		map[string]models.ApprovalRequest{
			"approval-1": {
				BaseModel: models.BaseModel{ID: "approval-1"},
				TargetID:  "order-1",
				Reason:    "Approval pending",
			},
		},
	)

	require.Len(t, results, 5)
	require.Equal(t, "approval-1", results[0].ID)
	require.Equal(t, float32(0.95), results[0].Score)
	require.Equal(t, "purchase-1", results[1].ID)
	require.Equal(t, float32(0.93), results[1].Score)
	require.Equal(t, "supplier-1", results[2].ID)
	require.Equal(t, float32(0.92), results[2].Score)
	require.Equal(t, "order-1", results[3].ID)
	require.Equal(t, float32(0.91), results[3].Score)
	require.Equal(t, "inv-1", results[4].ID)
	require.Equal(t, float32(0.88), results[4].Score)
}

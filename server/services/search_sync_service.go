package services

import (
	"strings"
	"time"
	"xdfc-server/models"
)

const (
	SearchCategoryInventory       = "inventory"
	SearchCategorySalesOrder      = "sales-order"
	SearchCategoryPurchaseOrder   = "purchase-order"
	SearchCategorySupplier        = "supplier"
	SearchCategoryApprovalRequest = "approval-request"
)

func buildSearchDocumentModel(parts ...string) string {
	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		filtered = append(filtered, trimmed)
	}
	return strings.Join(filtered, " ")
}

func searchDocumentVersion(updatedAt time.Time, createdAt time.Time) uint64 {
	versionAt := updatedAt
	if versionAt.IsZero() {
		versionAt = createdAt
	}
	if versionAt.IsZero() {
		versionAt = time.Now()
	}
	return uint64(versionAt.UnixNano())
}

func syncSearchDocument(doc SearchDocument) {
	if GlobalSearchClient == nil {
		return
	}
	go func() {
		_ = GlobalSearchClient.SyncIndex(doc)
	}()
}

func deleteSearchDocument(id string) {
	if GlobalSearchClient == nil {
		return
	}
	normalizedID := strings.TrimSpace(id)
	if normalizedID == "" {
		return
	}
	go func() {
		_ = GlobalSearchClient.DeleteIndex(normalizedID)
	}()
}

func inventorySearchDocument(inv models.Inventory) SearchDocument {
	return SearchDocument{
		ID:       inv.ID,
		Code:     strings.TrimSpace(inv.MaterialCode),
		Name:     strings.TrimSpace(inv.MaterialName),
		Model:    buildSearchDocumentModel(inv.MaterialSpec, inv.CategoryCode, inv.BatchNo),
		Category: SearchCategoryInventory,
		Version:  searchDocumentVersion(inv.UpdatedAt, inv.CreatedAt),
	}
}

func syncInventoryToSearch(inv models.Inventory) {
	syncSearchDocument(inventorySearchDocument(inv))
}

func salesOrderSearchDocument(order models.SalesOrder) SearchDocument {
	title := strings.TrimSpace(order.OrderName)
	if title == "" {
		title = strings.TrimSpace(order.CustomerName)
	}
	if title == "" {
		title = strings.TrimSpace(order.OrderNo)
	}

	return SearchDocument{
		ID:       order.ID,
		Code:     strings.TrimSpace(order.OrderNo),
		Name:     title,
		Model:    buildSearchDocumentModel(order.CustomerName, order.Status, order.PurchaseOrderNo, order.Barcode),
		Category: SearchCategorySalesOrder,
		Version:  searchDocumentVersion(order.UpdatedAt, order.CreatedAt),
	}
}

func salesOrderResponseSearchDocument(order SalesOrderResponse) SearchDocument {
	title := strings.TrimSpace(order.OrderName)
	if title == "" {
		title = strings.TrimSpace(order.CustomerName)
	}
	if title == "" {
		title = strings.TrimSpace(order.OrderNo)
	}

	return SearchDocument{
		ID:       order.ID,
		Code:     strings.TrimSpace(order.OrderNo),
		Name:     title,
		Model:    buildSearchDocumentModel(order.CustomerName, order.Status, order.PurchaseOrderNo, order.Barcode),
		Category: SearchCategorySalesOrder,
		Version:  searchDocumentVersion(order.UpdatedAt, order.CreatedAt),
	}
}

func syncSalesOrderToSearch(order SalesOrderResponse) {
	syncSearchDocument(salesOrderResponseSearchDocument(order))
}

func purchaseOrderSearchDocument(order models.PurchaseOrder) SearchDocument {
	title := strings.TrimSpace(order.SupplierName)
	if title == "" {
		title = strings.TrimSpace(order.OrderNo)
	}

	return SearchDocument{
		ID:       order.ID,
		Code:     strings.TrimSpace(order.OrderNo),
		Name:     title,
		Model:    buildSearchDocumentModel(order.SupplierName, order.Status, order.Purchaser),
		Category: SearchCategoryPurchaseOrder,
		Version:  searchDocumentVersion(order.UpdatedAt, order.CreatedAt),
	}
}

func purchaseOrderResponseSearchDocument(order PurchaseOrderResponse) SearchDocument {
	title := strings.TrimSpace(order.SupplierName)
	if title == "" {
		title = strings.TrimSpace(order.OrderNo)
	}

	return SearchDocument{
		ID:       order.ID,
		Code:     strings.TrimSpace(order.OrderNo),
		Name:     title,
		Model:    buildSearchDocumentModel(order.SupplierName, order.Status, order.Purchaser),
		Category: SearchCategoryPurchaseOrder,
		Version:  searchDocumentVersion(order.UpdatedAt, order.CreatedAt),
	}
}

func syncPurchaseOrderToSearch(order PurchaseOrderResponse) {
	syncSearchDocument(purchaseOrderResponseSearchDocument(order))
}

func supplierSearchDocument(supplier models.Supplier) SearchDocument {
	title := strings.TrimSpace(supplier.Name)
	if title == "" {
		title = strings.TrimSpace(supplier.Code)
	}

	return SearchDocument{
		ID:       supplier.ID,
		Code:     strings.TrimSpace(supplier.Code),
		Name:     title,
		Model:    buildSearchDocumentModel(supplier.Category, supplier.Status, supplier.ContactPerson, supplier.ContactPhone, supplier.MainProducts),
		Category: SearchCategorySupplier,
		Version:  searchDocumentVersion(supplier.UpdatedAt, supplier.CreatedAt),
	}
}

func syncSupplierToSearch(supplier models.Supplier) {
	syncSearchDocument(supplierSearchDocument(supplier))
}

func approvalRequestSearchDocument(request models.ApprovalRequest) SearchDocument {
	code := strings.TrimSpace(request.TargetID)
	if code == "" {
		code = strings.TrimSpace(request.ID)
	}

	title := strings.TrimSpace(request.Reason)
	if title == "" {
		title = buildSearchDocumentModel(request.Module, request.Action)
	}
	if title == "" {
		title = strings.TrimSpace(request.ID)
	}

	return SearchDocument{
		ID:       request.ID,
		Code:     code,
		Name:     title,
		Model:    buildSearchDocumentModel(request.Module, request.Action, request.Status, request.RequesterID),
		Category: SearchCategoryApprovalRequest,
		Version:  searchDocumentVersion(request.UpdatedAt, request.CreatedAt),
	}
}

func syncApprovalRequestToSearch(request models.ApprovalRequest) {
	syncSearchDocument(approvalRequestSearchDocument(request))
}

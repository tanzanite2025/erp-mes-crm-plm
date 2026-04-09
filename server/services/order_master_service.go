package services

import (
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var ErrSalesOrderDeleteRequiresCanceled = errors.New("sales order must be canceled before delete")

type SalesOrderListQuery struct {
	Page            int
	PageSize        int
	WithLines       bool
	StatusFilterRaw string
}

type PurchaseOrderListQuery struct {
	Page     int
	PageSize int
	Deleted  bool
}

func ListSalesOrders(query SalesOrderListQuery) (SalesOrderListResponse, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	var orders []models.SalesOrder
	var total int64

	tx := db.DB.Model(&models.SalesOrder{}).Where("is_deleted = ?", false)
	statusFilterRaw := strings.TrimSpace(query.StatusFilterRaw)
	if statusFilterRaw != "" {
		statuses := make([]string, 0)
		for _, item := range strings.Split(statusFilterRaw, ",") {
			status := strings.TrimSpace(item)
			if status != "" {
				statuses = append(statuses, status)
			}
		}
		if len(statuses) > 0 {
			tx = tx.Where("status IN ?", statuses)
		}
	}

	if err := tx.Count(&total).Error; err != nil {
		return SalesOrderListResponse{}, err
	}

	listTx := tx.Order("order_date desc").Limit(pageSize).Offset((page - 1) * pageSize)
	if query.WithLines {
		listTx = listTx.Preload("Lines")
	}
	if err := listTx.Find(&orders).Error; err != nil {
		return SalesOrderListResponse{}, err
	}

	return SalesOrderListResponse{
		Items:    MapSalesOrdersToListItems(orders),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func GetSalesOrderByID(id string) (SalesOrderResponse, error) {
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("id = ? AND is_deleted = ?", id, false).First(&order).Error; err != nil {
		return SalesOrderResponse{}, err
	}
	return MapSalesOrderToResponse(order), nil
}

func GetSalesOrderByNo(orderNo string) (SalesOrderResponse, error) {
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("order_no = ? AND is_deleted = ?", orderNo, false).First(&order).Error; err != nil {
		return SalesOrderResponse{}, err
	}
	return MapSalesOrderToResponse(order), nil
}

func DeleteSalesOrder(id string) error {
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("id = ?", id).First(&order).Error; err != nil {
		return err
	}

	if order.Status != "Canceled" {
		return ErrSalesOrderDeleteRequiresCanceled
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Model(&order).Updates(map[string]interface{}{
			"is_deleted": true,
			"version":    order.Version + 1,
		}).Error
	})
}

func SaveSalesOrderForBulkSync(tx *gorm.DB, order *models.SalesOrder) error {
	if order.ID == "" {
		return tx.Create(order).Error
	}

	var existing models.SalesOrder
	if err := tx.Where("id = ?", order.ID).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return tx.Create(order).Error
		}
		return err
	}

	if order.OrderNo == "" {
		order.OrderNo = existing.OrderNo
	}
	if order.OrderName == "" {
		order.OrderName = existing.OrderName
	}
	if order.CustomerName == "" {
		order.CustomerName = existing.CustomerName
	}
	if order.CustomerID == "" {
		order.CustomerID = existing.CustomerID
	}
	if order.Type == "" {
		order.Type = existing.Type
	}
	if order.Currency == "" {
		order.Currency = existing.Currency
	}
	if order.Classification == "" {
		order.Classification = existing.Classification
	}
	if order.Status == "" {
		order.Status = existing.Status
	}
	if order.StatusNote == "" {
		order.StatusNote = existing.StatusNote
	}
	if order.OrderDate == "" {
		order.OrderDate = existing.OrderDate
	}
	if order.DeliveryDate == "" {
		order.DeliveryDate = existing.DeliveryDate
	}
	if order.PurchaseOrderNo == "" {
		order.PurchaseOrderNo = existing.PurchaseOrderNo
	}
	if order.Barcode == "" {
		order.Barcode = existing.Barcode
	}
	if order.Requirements == "" {
		order.Requirements = existing.Requirements
	}
	if order.WorkflowInstanceID == "" {
		order.WorkflowInstanceID = existing.WorkflowInstanceID
	}
	if order.UpdatedBy == "" {
		order.UpdatedBy = existing.UpdatedBy
	}
	if order.Version == 0 {
		order.Version = existing.Version
	}

	updates := map[string]interface{}{
		"order_no":             order.OrderNo,
		"order_name":           order.OrderName,
		"customer_name":        order.CustomerName,
		"customer_id":          order.CustomerID,
		"type":                 order.Type,
		"currency":             order.Currency,
		"classification":       order.Classification,
		"status":               order.Status,
		"status_note":          order.StatusNote,
		"amount":               order.Amount,
		"quantity":             order.Quantity,
		"order_date":           order.OrderDate,
		"delivery_date":        order.DeliveryDate,
		"purchase_order_no":    order.PurchaseOrderNo,
		"barcode":              order.Barcode,
		"requirements":         order.Requirements,
		"workflow_instance_id": order.WorkflowInstanceID,
		"updated_by":           order.UpdatedBy,
		"is_deleted":           order.IsDeleted,
		"version":              order.Version,
	}
	return tx.Model(&existing).Updates(updates).Error
}

func BulkSyncSalesOrders(inputs []SalesOrderSnapshotRequest) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, payload := range inputs {
			order := MapSalesOrderSnapshotRequestToModel(payload)
			if err := SaveSalesOrderForBulkSync(tx, &order); err != nil {
				return err
			}
			if err := tx.Model(&order).Association("Lines").Replace(order.Lines); err != nil {
				return err
			}
		}
		return nil
	})
}

func ListPurchaseOrders(query PurchaseOrderListQuery) (PurchaseOrderListResponse, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	var orders []models.PurchaseOrder
	var total int64

	tx := db.DB.Model(&models.PurchaseOrder{}).Where("is_deleted = ?", query.Deleted)
	if err := tx.Count(&total).Error; err != nil {
		return PurchaseOrderListResponse{}, err
	}

	listTx := tx.Order("updated_at desc").Limit(pageSize).Offset((page - 1) * pageSize)
	if query.Deleted {
		listTx = listTx.Preload("Lines")
	}
	if err := listTx.Find(&orders).Error; err != nil {
		return PurchaseOrderListResponse{}, err
	}

	return PurchaseOrderListResponse{
		Items:    MapPurchaseOrdersToListItems(orders),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func GetPurchaseOrderByID(id string) (PurchaseOrderResponse, error) {
	var order models.PurchaseOrder
	if err := db.DB.Preload("Lines").First(&order, "id = ?", id).Error; err != nil {
		return PurchaseOrderResponse{}, err
	}
	return MapPurchaseOrderToResponse(order), nil
}

func DeletePurchaseOrder(id string) error {
	return db.DB.Model(&models.PurchaseOrder{}).Where("id = ?", id).Update("is_deleted", true).Error
}

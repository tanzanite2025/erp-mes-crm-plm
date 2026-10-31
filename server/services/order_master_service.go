package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/salesorderidentity"
	statemachine "xdfc-server/services/state_machine"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrSalesOrderDeleteRequiresCanceled = errors.New("sales order must be canceled before delete")
var ErrSalesOrderDeleteHasReturns = errors.New("sales order with sales returns cannot be deleted")
var ErrSalesOrderDeleteHasExchanges = errors.New("sales order with sales exchanges cannot be deleted")

type SalesOrderListQuery struct {
	Page            int
	PageSize        int
	WithLines       bool
	CustomerID      string
	Keyword         string
	PaymentMethod   string
	PaymentTerm     string
	StatusFilterRaw string
}

type PurchaseOrderListQuery struct {
	Page            int
	PageSize        int
	Deleted         bool
	WithLines       bool
	StatusFilterRaw string
}

func applySalesOrderRecordScope(query *gorm.DB) *gorm.DB {
	return query.Where(
		"NOT (LOWER(TRIM(COALESCE(classification, ''))) = ? OR LOWER(TRIM(COALESCE(type, ''))) = ?)",
		"quote",
		"quote",
	)
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

	tx := applySalesOrderRecordScope(db.DB.Model(&models.SalesOrder{}))
	customerID := strings.TrimSpace(query.CustomerID)
	if customerID != "" {
		tx = tx.Where("customer_id = ?", customerID)
	}
	keyword := strings.TrimSpace(query.Keyword)
	if keyword != "" {
		likeKeyword := "%" + keyword + "%"
		tx = tx.Where(
			`LOWER(order_no) LIKE LOWER(?)
			 OR LOWER(order_name) LIKE LOWER(?)
			 OR LOWER(customer_name) LIKE LOWER(?)
			 OR LOWER(COALESCE(purchase_order_no, '')) LIKE LOWER(?)
			 OR LOWER(COALESCE(payment_method, '')) LIKE LOWER(?)
			 OR LOWER(COALESCE(payment_method_name, '')) LIKE LOWER(?)
			 OR LOWER(COALESCE(payment_term, '')) LIKE LOWER(?)
			 OR LOWER(COALESCE(payment_term_name, '')) LIKE LOWER(?)`,
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
		)
	}
	paymentMethod := strings.TrimSpace(query.PaymentMethod)
	if paymentMethod != "" {
		tx = tx.Where("payment_method = ?", paymentMethod)
	}
	paymentTerm := strings.TrimSpace(query.PaymentTerm)
	if paymentTerm != "" {
		tx = tx.Where("payment_term = ?", paymentTerm)
	}
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
	} else {
		listTx = listTx.Preload("Lines", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id", "sales_order_id", "qty", "delivered_qty")
		})
	}
	if err := listTx.Find(&orders).Error; err != nil {
		return SalesOrderListResponse{}, err
	}

	returnedQuantityMap := make(map[uint]float64)
	if query.WithLines {
		metricsMap, metricsErr := loadSalesOrderReturnedQuantityMap(db.DB, orders)
		if metricsErr != nil {
			return SalesOrderListResponse{}, metricsErr
		}
		returnedQuantityMap = metricsMap
	}

	return SalesOrderListResponse{
		Items:    MapSalesOrdersToListItemsWithReturnMetrics(orders, query.WithLines, returnedQuantityMap),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func GetSalesOrderByID(id string) (SalesOrderResponse, error) {
	var order models.SalesOrder
	if err := applySalesOrderRecordScope(db.DB.Preload("Lines").Where("id = ?", id)).First(&order).Error; err != nil {
		return SalesOrderResponse{}, err
	}
	returnedQuantityMap, err := loadSalesOrderReturnedQuantityMap(db.DB, []models.SalesOrder{order})
	if err != nil {
		return SalesOrderResponse{}, err
	}
	return MapSalesOrderToResponseWithReturnMetrics(order, returnedQuantityMap), nil
}

func GetSalesOrderByNo(orderNo string) (SalesOrderResponse, error) {
	var order models.SalesOrder
	if err := applySalesOrderRecordScope(db.DB.Preload("Lines").Where("order_no = ?", orderNo)).First(&order).Error; err != nil {
		return SalesOrderResponse{}, err
	}
	returnedQuantityMap, err := loadSalesOrderReturnedQuantityMap(db.DB, []models.SalesOrder{order})
	if err != nil {
		return SalesOrderResponse{}, err
	}
	return MapSalesOrderToResponseWithReturnMetrics(order, returnedQuantityMap), nil
}

func DeleteSalesOrder(id string) error {
	var order models.SalesOrder
	if err := applySalesOrderRecordScope(db.DB.Preload("Lines").Where("id = ?", id)).First(&order).Error; err != nil {
		return err
	}

	if order.Status != "Canceled" {
		return ErrSalesOrderDeleteRequiresCanceled
	}

	var relatedReturns int64
	if err := db.DB.Model(&models.SalesReturn{}).
		Where("sales_order_id = ? AND deleted_at IS NULL", order.ID).
		Count(&relatedReturns).Error; err != nil {
		return err
	}
	if relatedReturns > 0 {
		return ErrSalesOrderDeleteHasReturns
	}

	var relatedExchanges int64
	if err := db.DB.Model(&models.SalesExchange{}).
		Where("sales_order_id = ? AND deleted_at IS NULL", order.ID).
		Count(&relatedExchanges).Error; err != nil {
		return err
	}
	if relatedExchanges > 0 {
		return ErrSalesOrderDeleteHasExchanges
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := applySalesOrderRecordScope(tx.Clauses(clause.Locking{Strength: "UPDATE"})).First(&order, "id = ?", id).Error; err != nil {
			return err
		}
		if order.Status != "Canceled" {
			return ErrSalesOrderDeleteRequiresCanceled
		}
		if err := rejectSalesOrderRemovalWithActiveProductionMaterialCoverageTx(tx, order.ID); err != nil {
			return err
		}
		if err := tx.Model(&order).Omit("Lines").Update("version", order.Version+1).Error; err != nil {
			return err
		}
		if err := tx.Delete(&order).Error; err != nil {
			return err
		}
		return ResolveSystemNotificationInboxEntriesWithinTransaction(tx, SystemNotificationInboxResolutionFilter{SourceCode: businessEventSourceSalesOrder, BusinessTargetID: order.ID})
	}); err != nil {
		return err
	}

	return nil
}

func SaveSalesOrderForBulkSync(tx *gorm.DB, order *models.SalesOrder) error {
	order.OrderNo = strings.TrimSpace(order.OrderNo)
	order.Barcode = strings.TrimSpace(order.Barcode)
	if order.OrderNo == "" {
		order.OrderNo = order.Barcode
	}
	if order.ID == "" {
		if order.Status == "" {
			order.Status = "Pending"
		}
		if status := statemachine.NormalizeSalesOrderStatus(order.Status); status != statemachine.SalesOrderStatusDraft && status != statemachine.SalesOrderStatusPending {
			return fmt.Errorf("%w: 新建订单不能预设生产或履约进度", ErrSalesTransactionInvalidPayload)
		}
		order.Status = string(statemachine.NormalizeSalesOrderStatus(order.Status))
		if order.OrderNo == "" {
			return fmt.Errorf("sales order orderNo is required")
		}
		if err := validateAndAssignSalesOrderLineOwnershipForSave(order.ID, nil, order.Lines); err != nil {
			return err
		}
		order.Version = 1
		preserveSalesOrderLineExecutionFactsByStableIdentity(nil, order.Lines)
		recalculateSalesOrderAuthorityCosts(order)
		return tx.Omit("Lines").Create(order).Error
	}

	var existing models.SalesOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines").Where("id = ?", order.ID).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if order.Status == "" {
				order.Status = "Pending"
			}
			if status := statemachine.NormalizeSalesOrderStatus(order.Status); status != statemachine.SalesOrderStatusDraft && status != statemachine.SalesOrderStatusPending {
				return fmt.Errorf("%w: 新建订单不能预设生产或履约进度", ErrSalesTransactionInvalidPayload)
			}
			order.Status = string(statemachine.NormalizeSalesOrderStatus(order.Status))
			if order.OrderNo == "" {
				return fmt.Errorf("sales order orderNo is required")
			}
			if err := validateAndAssignSalesOrderLineOwnershipForSave(order.ID, nil, order.Lines); err != nil {
				return err
			}
			order.Version = 1
			preserveSalesOrderLineExecutionFactsByStableIdentity(nil, order.Lines)
			recalculateSalesOrderAuthorityCosts(order)
			return tx.Omit("Lines").Create(order).Error
		}
		return err
	}
	if order.Version != existing.Version {
		return ErrSalesTransactionVersionConflict
	}
	if err := validateAndAssignSalesOrderLineOwnershipForSave(order.ID, existing.Lines, order.Lines); err != nil {
		return err
	}
	preserveSalesOrderLineExecutionFactsByStableIdentity(existing.Lines, order.Lines)

	order.OrderNo, order.Barcode = salesorderidentity.ResolveSalesOrderIdentity(order.OrderNo, order.Barcode, existing.OrderNo)
	if order.OrderNo == "" {
		order.OrderNo = strings.TrimSpace(existing.Barcode)
	}
	if order.Barcode == "" {
		order.Barcode = strings.TrimSpace(existing.Barcode)
	}
	if order.OrderNo == "" {
		return fmt.Errorf("sales order orderNo is required")
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
	if order.ExchangeRateSnapshot <= 0 {
		order.ExchangeRateSnapshot = existing.ExchangeRateSnapshot
	}
	if order.PaymentMethod == "" {
		order.PaymentMethod = existing.PaymentMethod
	}
	if order.PaymentMethodName == "" {
		order.PaymentMethodName = existing.PaymentMethodName
	}
	if order.PaymentTerm == "" {
		order.PaymentTerm = existing.PaymentTerm
	}
	if order.PaymentTermName == "" {
		order.PaymentTermName = existing.PaymentTermName
	}
	if order.Classification == "" {
		order.Classification = existing.Classification
	}
	if order.Status == "" {
		order.Status = existing.Status
	}
	if order.Status != existing.Status {
		return fmt.Errorf("%w: 批量同步不能修改业务进度，请使用确认或作废动作", ErrSalesTransactionInvalidPayload)
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
	if order.Requirements == "" {
		order.Requirements = existing.Requirements
	}
	if order.UpdatedBy == "" {
		order.UpdatedBy = existing.UpdatedBy
	}
	if err := validateSalesOrderMutationAgainstActiveProductionMaterialCoverageTx(tx, order); err != nil {
		return err
	}
	order.Version = existing.Version + 1
	recalculateSalesOrderAuthorityCosts(order)

	updates := map[string]interface{}{
		"order_no":               order.OrderNo,
		"order_name":             order.OrderName,
		"customer_name":          order.CustomerName,
		"customer_id":            order.CustomerID,
		"type":                   order.Type,
		"currency":               order.Currency,
		"exchange_rate_snapshot": order.ExchangeRateSnapshot,
		"payment_method":         order.PaymentMethod,
		"payment_method_name":    order.PaymentMethodName,
		"payment_term":           order.PaymentTerm,
		"payment_term_name":      order.PaymentTermName,
		"classification":         order.Classification,
		"status":                 order.Status,
		"status_note":            order.StatusNote,
		"amount":                 order.Amount,
		"quantity":               order.Quantity,
		"order_date":             order.OrderDate,
		"delivery_date":          order.DeliveryDate,
		"purchase_order_no":      order.PurchaseOrderNo,
		"barcode":                order.Barcode,
		"requirements":           order.Requirements,
		"updated_by":             order.UpdatedBy,
		"deleted_at":             nil,
		"version":                order.Version,
	}
	if order.DeletedAt.Valid || order.IsDeleted {
		updates["deleted_at"] = gorm.Expr("COALESCE(deleted_at, NOW())")
	}
	return tx.Model(&existing).Omit("Lines").Updates(updates).Error
}

func BulkSyncSalesOrders(inputs []SalesOrderSnapshotRequest) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, payload := range inputs {
			order := MapSalesOrderSnapshotRequestToModel(payload)
			if err := SaveSalesOrderForBulkSync(tx, &order); err != nil {
				return err
			}
			if err := persistSalesOrderLinesByStableIdentityTx(tx, order.ID, order.Lines); err != nil {
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

	tx := db.DB.Model(&models.PurchaseOrder{})
	if query.Deleted {
		tx = tx.Unscoped().Where("deleted_at IS NOT NULL")
	}
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
		return PurchaseOrderListResponse{}, err
	}

	listTx := tx.Order("updated_at desc").Limit(pageSize).Offset((page - 1) * pageSize)
	if query.WithLines {
		listTx = listTx.Preload("Lines")
	}
	if err := listTx.Find(&orders).Error; err != nil {
		return PurchaseOrderListResponse{}, err
	}

	return PurchaseOrderListResponse{
		Items:    MapPurchaseOrdersToListItems(orders, query.WithLines),
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
	var order models.PurchaseOrder
	if err := db.DB.Where("id = ?", id).First(&order).Error; err != nil {
		return err
	}
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&order).Update("version", order.Version+1).Error; err != nil {
			return err
		}
		return tx.Delete(&order).Error
	}); err != nil {
		return err
	}

	return nil
}

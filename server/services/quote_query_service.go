package services

import (
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func ConvertQuoteToSalesOrder(id string, operator string) (QuoteConvertResponse, error) {
	orderID := strings.TrimSpace(id)
	if orderID == "" {
		return QuoteConvertResponse{}, fmt.Errorf("quote id is required")
	}

	var order models.SalesOrder
	if err := db.DB.Where("id = ? AND is_deleted = ?", orderID, false).First(&order).Error; err != nil {
		return QuoteConvertResponse{}, err
	}

	nextStatus := strings.TrimSpace(order.Status)
	if !strings.EqualFold(nextStatus, "converted") {
		nextStatus = "converted"
		updates := map[string]any{
			"status":     nextStatus,
			"updated_at": time.Now(),
		}
		if strings.TrimSpace(operator) != "" {
			updates["updated_by"] = strings.TrimSpace(operator)
		}
		if err := db.DB.Model(&models.SalesOrder{}).Where("id = ?", orderID).Updates(updates).Error; err != nil {
			return QuoteConvertResponse{}, err
		}
		order.Status = nextStatus
	}

	targetOrderNo := strings.TrimSpace(order.OrderNo)
	if targetOrderNo == "" {
		targetOrderNo = strings.TrimSpace(order.Barcode)
	}
	if targetOrderNo == "" {
		targetOrderNo = order.ID
	}

	return QuoteConvertResponse{
		QuoteID:            order.ID,
		TargetSalesOrderID: order.ID,
		TargetSalesOrderNo: targetOrderNo,
		Status:             order.Status,
	}, nil
}

func ListQuotes(query QuoteListQuery) (QuoteListResponse, error) {
	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize < 1 {
		pageSize = 50
	}

	var orders []models.SalesOrder
	baseQuery := db.DB.Model(&models.SalesOrder{}).Where("is_deleted = ?", false)

	if status := strings.TrimSpace(query.StatusRaw); status != "" {
		baseQuery = baseQuery.Where("status = ?", status)
	}
	if quoteType := strings.TrimSpace(query.TypeRaw); quoteType != "" {
		baseQuery = baseQuery.Where("type = ?", quoteType)
	}
	if keyword := strings.TrimSpace(query.Keyword); keyword != "" {
		likeKeyword := "%" + keyword + "%"
		baseQuery = baseQuery.Where(
			"order_no ILIKE ? OR order_name ILIKE ? OR customer_name ILIKE ? OR requirements ILIKE ?",
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
		)
	}

	if err := baseQuery.Preload("Lines").Order("updated_at desc").Find(&orders).Error; err != nil {
		return QuoteListResponse{}, err
	}

	customerIDs := make([]string, 0, len(orders))
	for _, order := range orders {
		customerID := strings.TrimSpace(order.CustomerID)
		if customerID != "" {
			customerIDs = append(customerIDs, customerID)
		}
	}

	customerByID := make(map[string]models.Customer, len(customerIDs))
	if len(customerIDs) > 0 {
		var customers []models.Customer
		if err := db.DB.Model(&models.Customer{}).Where("id IN ? AND is_deleted = ?", customerIDs, false).Find(&customers).Error; err != nil {
			return QuoteListResponse{}, err
		}
		for _, customer := range customers {
			customerByID[customer.ID] = customer
		}
	}

	items := make([]QuoteSummaryResponse, 0, len(orders))
	customerSegmentFilter := strings.TrimSpace(query.CustomerSegmentRaw)
	for _, order := range orders {
		customer := customerByID[order.CustomerID]
		customerSegment := deriveQuoteCustomerSegment(customer)
		if customerSegmentFilter != "" && !strings.EqualFold(customerSegmentFilter, customerSegment) {
			continue
		}
		items = append(items, mapSalesOrderToQuoteSummary(order, customerSegment))
	}

	total := int64(len(items))
	start := (page - 1) * pageSize
	if start > len(items) {
		start = len(items)
	}
	end := start + pageSize
	if end > len(items) {
		end = len(items)
	}

	return QuoteListResponse{
		Items:    items[start:end],
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func deriveQuoteCustomerSegment(customer models.Customer) string {
	if customer.ID == "" {
		return "new"
	}

	if customer.CreditLimit >= 10000 || customer.Balance >= 5000 {
		return "vip"
	}

	if !customer.CreatedAt.IsZero() {
		if time.Since(customer.CreatedAt) > 90*24*time.Hour {
			return "long-term"
		}
	}

	return "new"
}

func mapSalesOrderToQuoteSummary(order models.SalesOrder, customerSegment string) QuoteSummaryResponse {
	productSummary := strings.TrimSpace(order.Requirements)
	if productSummary == "" && len(order.Lines) > 0 {
		productSummary = strings.TrimSpace(order.Lines[0].ProductModel)
	}
	if productSummary == "" {
		productSummary = "待补充产品摘要"
	}

	quoteNo := strings.TrimSpace(order.OrderNo)
	if quoteNo == "" {
		quoteNo = strings.TrimSpace(order.Barcode)
	}
	if quoteNo == "" {
		quoteNo = order.ID
	}

	return QuoteSummaryResponse{
		ID:              order.ID,
		QuoteNo:         quoteNo,
		CustomerName:    strings.TrimSpace(order.CustomerName),
		CustomerSegment: customerSegment,
		Type:            strings.TrimSpace(order.Type),
		Status:          strings.TrimSpace(order.Status),
		UpdatedAt:       order.UpdatedAt.Format("2006-01-02 15:04"),
		AmountLabel:     fmt.Sprintf("¥ %.2f", order.Amount),
		ItemCount:       len(order.Lines),
		OwnerName:       strings.TrimSpace(order.UpdatedBy),
		ProductSummary:  productSummary,
	}
}

func GetQuoteDetail(id string) (QuoteDetailResponse, error) {
	var order models.SalesOrder
	if err := db.DB.Preload("Lines").Where("id = ? AND is_deleted = ?", id, false).First(&order).Error; err != nil {
		return QuoteDetailResponse{}, err
	}

	var customer models.Customer
	if strings.TrimSpace(order.CustomerID) != "" {
		if err := db.DB.Where("id = ? AND is_deleted = ?", order.CustomerID, false).First(&customer).Error; err != nil {
			if err != nil && !errorsIsRecordNotFound(err) {
				return QuoteDetailResponse{}, err
			}
		}
	}

	return mapSalesOrderToQuoteDetail(order, customer, deriveQuoteCustomerSegment(customer)), nil
}

func mapSalesOrderToQuoteDetail(order models.SalesOrder, customer models.Customer, customerSegment string) QuoteDetailResponse {
	quoteNo := strings.TrimSpace(order.OrderNo)
	if quoteNo == "" {
		quoteNo = strings.TrimSpace(order.Barcode)
	}
	if quoteNo == "" {
		quoteNo = order.ID
	}

	lines := make([]QuoteDetailLineResponse, 0, len(order.Lines))
	for _, line := range order.Lines {
		lines = append(lines, QuoteDetailLineResponse{
			ID:            line.ID,
			LineNo:        line.LineNo,
			ProductModel:  line.ProductModel,
			ProductCode:   line.ProductCode,
			Specification: line.Specification,
			Qty:           line.Qty,
			Price:         line.Price,
			Amount:        line.Amount,
			UOM:           line.UOM,
			Note:          line.Note,
		})
	}

	return QuoteDetailResponse{
		ID:                order.ID,
		QuoteNo:           quoteNo,
		OrderName:         strings.TrimSpace(order.OrderName),
		CustomerName:      strings.TrimSpace(order.CustomerName),
		CustomerID:        strings.TrimSpace(order.CustomerID),
		WeChat:            strings.TrimSpace(customer.WeChat),
		WhatsApp:          strings.TrimSpace(customer.WhatsApp),
		CustomerSegment:   customerSegment,
		Type:              strings.TrimSpace(order.Type),
		Status:            strings.TrimSpace(order.Status),
		Currency:          strings.TrimSpace(order.Currency),
		AmountLabel:       fmt.Sprintf("¥ %.2f", order.Amount),
		QuantityLabel:     fmt.Sprintf("%.2f", order.Quantity),
		OrderDate:         strings.TrimSpace(order.OrderDate),
		DeliveryDate:      strings.TrimSpace(order.DeliveryDate),
		PaymentMethodName: strings.TrimSpace(order.PaymentMethodName),
		PaymentTermName:   strings.TrimSpace(order.PaymentTermName),
		Requirements:      strings.TrimSpace(order.Requirements),
		OwnerName:         strings.TrimSpace(order.UpdatedBy),
		UpdatedAt:         order.UpdatedAt.Format("2006-01-02 15:04"),
		Lines:             lines,
	}
}

func errorsIsRecordNotFound(err error) bool {
	return err == gorm.ErrRecordNotFound || strings.Contains(strings.ToLower(err.Error()), "record not found")
}

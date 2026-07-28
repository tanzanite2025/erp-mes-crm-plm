package services

import (
	"math"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type SalesOrderAfterSalesReturnSummaryResponse struct {
	Count                int     `json:"count"`
	TotalQuantity        float64 `json:"totalQuantity"`
	TotalAmount          float64 `json:"totalAmount"`
	PendingTrackingCount int     `json:"pendingTrackingCount"`
	OpenCount            int     `json:"openCount"`
	LatestReturnNo       string  `json:"latestReturnNo"`
	LatestStatus         string  `json:"latestStatus"`
}

type SalesOrderAfterSalesExchangeSummaryResponse struct {
	Count                   int     `json:"count"`
	TotalQuantity           float64 `json:"totalQuantity"`
	OpenCount               int     `json:"openCount"`
	OldItemPendingCount     int     `json:"oldItemPendingCount"`
	ReplacementPendingCount int     `json:"replacementPendingCount"`
	LatestExchangeNo        string  `json:"latestExchangeNo"`
	LatestStatus            string  `json:"latestStatus"`
}

type SalesOrderAfterSalesSummaryResponse struct {
	SalesOrderID string                                      `json:"salesOrderId"`
	Returns      SalesOrderAfterSalesReturnSummaryResponse   `json:"returns"`
	Exchanges    SalesOrderAfterSalesExchangeSummaryResponse `json:"exchanges"`
	Lines        []SalesOrderAfterSalesLineSummaryResponse   `json:"lines"`
}

type SalesOrderAfterSalesReturnReferenceResponse struct {
	ID                string  `json:"id"`
	ReturnNo          string  `json:"returnNo"`
	Status            string  `json:"status"`
	RequestedQuantity float64 `json:"requestedQuantity"`
	ReceivedQuantity  float64 `json:"receivedQuantity"`
	TrackingNo        string  `json:"trackingNo"`
}

type SalesOrderAfterSalesExchangeReferenceResponse struct {
	ID                         string  `json:"id"`
	ExchangeNo                 string  `json:"exchangeNo"`
	Status                     string  `json:"status"`
	RequestedQuantity          float64 `json:"requestedQuantity"`
	OldItemReceivedQuantity    float64 `json:"oldItemReceivedQuantity"`
	ReplacementShippedQuantity float64 `json:"replacementShippedQuantity"`
	ReplacementProductCode     string  `json:"replacementProductCode"`
	OldItemTrackingNo          string  `json:"oldItemTrackingNo"`
	ReplacementTrackingNo      string  `json:"replacementTrackingNo"`
}

type SalesOrderAfterSalesLineSummaryResponse struct {
	SalesOrderLineID           uint                                            `json:"salesOrderLineId"`
	LineNo                     int                                             `json:"lineNo"`
	ProductCode                string                                          `json:"productCode"`
	DeliveredQuantity          float64                                         `json:"deliveredQuantity"`
	ReturnRequestedQuantity    float64                                         `json:"returnRequestedQuantity"`
	ReturnReceivedQuantity     float64                                         `json:"returnReceivedQuantity"`
	ExchangeRequestedQuantity  float64                                         `json:"exchangeRequestedQuantity"`
	OldItemReceivedQuantity    float64                                         `json:"oldItemReceivedQuantity"`
	ReplacementShippedQuantity float64                                         `json:"replacementShippedQuantity"`
	LatestReturnStatus         string                                          `json:"latestReturnStatus"`
	LatestExchangeStatus       string                                          `json:"latestExchangeStatus"`
	RelatedReturns             []SalesOrderAfterSalesReturnReferenceResponse   `json:"relatedReturns"`
	RelatedExchanges           []SalesOrderAfterSalesExchangeReferenceResponse `json:"relatedExchanges"`
}

func ListSalesOrderAfterSalesSummaries(rawOrderIDs []string) ([]SalesOrderAfterSalesSummaryResponse, error) {
	orderIDs := normalizeSalesOrderAfterSalesSummaryOrderIDs(rawOrderIDs)
	if len(orderIDs) == 0 {
		return []SalesOrderAfterSalesSummaryResponse{}, nil
	}

	summaryByOrderID := make(map[string]*SalesOrderAfterSalesSummaryResponse, len(orderIDs))
	for _, orderID := range orderIDs {
		summaryByOrderID[orderID] = &SalesOrderAfterSalesSummaryResponse{
			SalesOrderID: orderID,
			Lines:        []SalesOrderAfterSalesLineSummaryResponse{},
		}
	}

	if err := appendSalesReturnAfterSalesSummaries(summaryByOrderID, orderIDs); err != nil {
		return nil, err
	}
	if err := appendSalesExchangeAfterSalesSummaries(summaryByOrderID, orderIDs); err != nil {
		return nil, err
	}
	if err := appendSalesOrderAfterSalesLineSummaries(summaryByOrderID, orderIDs); err != nil {
		return nil, err
	}

	items := make([]SalesOrderAfterSalesSummaryResponse, 0, len(orderIDs))
	for _, orderID := range orderIDs {
		items = append(items, *summaryByOrderID[orderID])
	}
	return items, nil
}

func normalizeSalesOrderAfterSalesSummaryOrderIDs(rawOrderIDs []string) []string {
	seen := make(map[string]struct{}, len(rawOrderIDs))
	orderIDs := make([]string, 0, len(rawOrderIDs))
	for _, rawOrderID := range rawOrderIDs {
		orderID := strings.TrimSpace(rawOrderID)
		if orderID == "" {
			continue
		}
		if _, ok := seen[orderID]; ok {
			continue
		}
		seen[orderID] = struct{}{}
		orderIDs = append(orderIDs, orderID)
	}
	return orderIDs
}

func appendSalesReturnAfterSalesSummaries(summaryByOrderID map[string]*SalesOrderAfterSalesSummaryResponse, orderIDs []string) error {
	var records []models.SalesReturn
	if err := db.DB.
		Select("id, return_no, sales_order_id, status, tracking_no, total_quantity, total_amount, return_date, created_at, deleted_at").
		Where("sales_order_id IN ?", orderIDs).
		Order("return_date desc, created_at desc").
		Find(&records).Error; err != nil {
		return err
	}

	for _, record := range records {
		summary, ok := summaryByOrderID[record.SalesOrderID]
		if !ok {
			continue
		}

		status := normalizeSalesReturnStatus(record.Status)
		if status == SalesReturnStatusCanceled {
			continue
		}

		summary.Returns.Count++
		summary.Returns.TotalQuantity += record.TotalQuantity
		summary.Returns.TotalAmount += record.TotalAmount
		if summary.Returns.LatestReturnNo == "" {
			summary.Returns.LatestReturnNo = record.ReturnNo
			summary.Returns.LatestStatus = status
		}
		if status != SalesReturnStatusClosed && status != SalesReturnStatusCompleted {
			summary.Returns.OpenCount++
		}
		if deriveSalesReturnPendingTracking(record.TrackingNo, status) {
			summary.Returns.PendingTrackingCount++
		}
	}

	return nil
}

func appendSalesOrderAfterSalesLineSummaries(
	summaryByOrderID map[string]*SalesOrderAfterSalesSummaryResponse,
	orderIDs []string,
) error {
	var orderLines []models.SalesOrderLine
	if err := db.DB.
		Select("id, sales_order_id, line_no, product_code, delivered_qty").
		Where("sales_order_id IN ?", orderIDs).
		Order("sales_order_id, line_no, id").
		Find(&orderLines).Error; err != nil {
		return err
	}

	type lineSummaryLocation struct {
		orderID string
		index   int
	}
	lineSummaryByID := make(map[uint]lineSummaryLocation, len(orderLines))
	for _, line := range orderLines {
		summary, ok := summaryByOrderID[line.SalesOrderID]
		if !ok {
			continue
		}
		item := SalesOrderAfterSalesLineSummaryResponse{
			SalesOrderLineID:  line.ID,
			LineNo:            line.LineNo,
			ProductCode:       strings.TrimSpace(line.ProductCode),
			DeliveredQuantity: line.DeliveredQty,
			RelatedReturns:    []SalesOrderAfterSalesReturnReferenceResponse{},
			RelatedExchanges:  []SalesOrderAfterSalesExchangeReferenceResponse{},
		}
		summary.Lines = append(summary.Lines, item)
		lineSummaryByID[line.ID] = lineSummaryLocation{
			orderID: line.SalesOrderID,
			index:   len(summary.Lines) - 1,
		}
	}

	var returns []models.SalesReturn
	if err := db.DB.
		Where("sales_order_id IN ?", orderIDs).
		Select("id, return_no, sales_order_id, status, tracking_no, return_date, created_at, deleted_at").
		Preload("Lines", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, sales_return_id, sales_order_line_id, quantity, received_quantity")
		}).
		Order("return_date desc, created_at desc").
		Find(&returns).Error; err != nil {
		return err
	}
	for _, record := range returns {
		status := normalizeSalesReturnStatus(record.Status)
		if status == SalesReturnStatusCanceled {
			continue
		}
		for _, line := range record.Lines {
			location, ok := lineSummaryByID[line.SalesOrderLineID]
			if !ok {
				continue
			}
			orderSummary := summaryByOrderID[location.orderID]
			if orderSummary == nil || location.index >= len(orderSummary.Lines) {
				continue
			}
			summary := &orderSummary.Lines[location.index]
			summary.ReturnRequestedQuantity += line.Quantity
			summary.ReturnReceivedQuantity += line.ReceivedQuantity
			if summary.LatestReturnStatus == "" {
				summary.LatestReturnStatus = status
			}
			summary.RelatedReturns = append(summary.RelatedReturns, SalesOrderAfterSalesReturnReferenceResponse{
				ID:                record.ID,
				ReturnNo:          record.ReturnNo,
				Status:            status,
				RequestedQuantity: line.Quantity,
				ReceivedQuantity:  line.ReceivedQuantity,
				TrackingNo:        strings.TrimSpace(record.TrackingNo),
			})
		}
	}

	var exchanges []models.SalesExchange
	if err := db.DB.
		Where("sales_order_id IN ?", orderIDs).
		Select("id, exchange_no, sales_order_id, status, exchange_date, created_at, deleted_at, received_old_item_tracking_no, replacement_tracking_no").
		Preload("Lines", func(tx *gorm.DB) *gorm.DB {
			return tx.Select("id, sales_exchange_id, sales_order_line_id, exchange_quantity, old_item_received_quantity, replacement_shipped_quantity, replacement_product_code")
		}).
		Order("exchange_date desc, created_at desc").
		Find(&exchanges).Error; err != nil {
		return err
	}
	for _, record := range exchanges {
		status := normalizeSalesExchangeStatus(record.Status)
		if status == SalesExchangeStatusCanceled {
			continue
		}
		for _, line := range record.Lines {
			location, ok := lineSummaryByID[line.SalesOrderLineID]
			if !ok {
				continue
			}
			orderSummary := summaryByOrderID[location.orderID]
			if orderSummary == nil || location.index >= len(orderSummary.Lines) {
				continue
			}
			summary := &orderSummary.Lines[location.index]
			summary.ExchangeRequestedQuantity += line.ExchangeQuantity
			summary.OldItemReceivedQuantity += line.OldItemReceivedQuantity
			summary.ReplacementShippedQuantity += line.ReplacementShippedQuantity
			if summary.LatestExchangeStatus == "" {
				summary.LatestExchangeStatus = status
			}
			summary.RelatedExchanges = append(summary.RelatedExchanges, SalesOrderAfterSalesExchangeReferenceResponse{
				ID:                         record.ID,
				ExchangeNo:                 record.ExchangeNo,
				Status:                     status,
				RequestedQuantity:          line.ExchangeQuantity,
				OldItemReceivedQuantity:    line.OldItemReceivedQuantity,
				ReplacementShippedQuantity: line.ReplacementShippedQuantity,
				ReplacementProductCode:     strings.TrimSpace(line.ReplacementProductCode),
				OldItemTrackingNo:          strings.TrimSpace(record.ReceivedOldItemTrackingNo),
				ReplacementTrackingNo:      strings.TrimSpace(record.ReplacementTrackingNo),
			})
		}
	}

	for _, summary := range summaryByOrderID {
		for index := range summary.Lines {
			line := &summary.Lines[index]
			line.DeliveredQuantity = roundAfterSalesQuantity(line.DeliveredQuantity)
			line.ReturnRequestedQuantity = roundAfterSalesQuantity(line.ReturnRequestedQuantity)
			line.ReturnReceivedQuantity = roundAfterSalesQuantity(line.ReturnReceivedQuantity)
			line.ExchangeRequestedQuantity = roundAfterSalesQuantity(line.ExchangeRequestedQuantity)
			line.OldItemReceivedQuantity = roundAfterSalesQuantity(line.OldItemReceivedQuantity)
			line.ReplacementShippedQuantity = roundAfterSalesQuantity(line.ReplacementShippedQuantity)
			if line.RelatedReturns == nil {
				line.RelatedReturns = []SalesOrderAfterSalesReturnReferenceResponse{}
			}
			if line.RelatedExchanges == nil {
				line.RelatedExchanges = []SalesOrderAfterSalesExchangeReferenceResponse{}
			}
		}
	}

	return nil
}

func roundAfterSalesQuantity(value float64) float64 {
	return math.Round(value*100) / 100
}

func appendSalesExchangeAfterSalesSummaries(summaryByOrderID map[string]*SalesOrderAfterSalesSummaryResponse, orderIDs []string) error {
	var records []models.SalesExchange
	if err := db.DB.
		Select("id, exchange_no, sales_order_id, status, exchange_date, total_exchange_quantity, created_at, deleted_at").
		Where("sales_order_id IN ?", orderIDs).
		Order("exchange_date desc, created_at desc").
		Find(&records).Error; err != nil {
		return err
	}

	for _, record := range records {
		summary, ok := summaryByOrderID[record.SalesOrderID]
		if !ok {
			continue
		}

		status := normalizeSalesExchangeStatus(record.Status)
		if status == SalesExchangeStatusCanceled {
			continue
		}

		summary.Exchanges.Count++
		summary.Exchanges.TotalQuantity += record.TotalExchangeQuantity
		if summary.Exchanges.LatestExchangeNo == "" {
			summary.Exchanges.LatestExchangeNo = record.ExchangeNo
			summary.Exchanges.LatestStatus = status
		}
		if !isTerminalSalesExchangeStatus(status) {
			summary.Exchanges.OpenCount++
		}
		if status == SalesExchangeStatusDraft ||
			status == SalesExchangeStatusOldItemPartiallyReceived {
			summary.Exchanges.OldItemPendingCount++
		}
		if status == SalesExchangeStatusOldItemReceived ||
			status == SalesExchangeStatusReplacementPrepared ||
			status == SalesExchangeStatusReplacementPartiallyShipped {
			summary.Exchanges.ReplacementPendingCount++
		}
	}

	return nil
}

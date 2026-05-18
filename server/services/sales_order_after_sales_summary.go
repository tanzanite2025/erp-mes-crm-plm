package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
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
}

func ListSalesOrderAfterSalesSummaries(rawOrderIDs []string) ([]SalesOrderAfterSalesSummaryResponse, error) {
	orderIDs := normalizeSalesOrderAfterSalesSummaryOrderIDs(rawOrderIDs)
	if len(orderIDs) == 0 {
		return []SalesOrderAfterSalesSummaryResponse{}, nil
	}

	summaryByOrderID := make(map[string]*SalesOrderAfterSalesSummaryResponse, len(orderIDs))
	for _, orderID := range orderIDs {
		summaryByOrderID[orderID] = &SalesOrderAfterSalesSummaryResponse{SalesOrderID: orderID}
	}

	if err := appendSalesReturnAfterSalesSummaries(summaryByOrderID, orderIDs); err != nil {
		return nil, err
	}
	if err := appendSalesExchangeAfterSalesSummaries(summaryByOrderID, orderIDs); err != nil {
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

func appendSalesExchangeAfterSalesSummaries(summaryByOrderID map[string]*SalesOrderAfterSalesSummaryResponse, orderIDs []string) error {
	var records []models.SalesExchange
	if err := db.DB.
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
		if status == SalesExchangeStatusDraft {
			summary.Exchanges.OldItemPendingCount++
		}
		if status == SalesExchangeStatusOldItemReceived || status == SalesExchangeStatusReplacementPrepared {
			summary.Exchanges.ReplacementPendingCount++
		}
	}

	return nil
}

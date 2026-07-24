package services

import (
	"time"
	"xdfc-server/models"
)

type OutsourceOrderLineDTO struct {
	ID               string    `json:"id"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	OutsourceOrderID string    `json:"outsourceOrderId"`
	LineNo           int       `json:"lineNo"`
	SourceLineID     string    `json:"sourceLineId"`
	ProductID        string    `json:"productId"`
	ProductCode      string    `json:"productCode"`
	ProductName      string    `json:"productName"`
	Specification    string    `json:"specification"`
	Quantity         float64   `json:"quantity"`
	UOM              string    `json:"uom"`
	SegmentID        string    `json:"segmentId"`
	SegmentName      string    `json:"segmentName"`
	ProcessStepID    string    `json:"processStepId"`
	ProcessCode      string    `json:"processCode"`
	ProcessName      string    `json:"processName"`
	Status           string    `json:"status"`
	Notes            string    `json:"notes"`
	Version          int64     `json:"version"`
}

type OutsourceOrderDTO struct {
	ID                  string                  `json:"id"`
	CreatedAt           time.Time               `json:"createdAt"`
	UpdatedAt           time.Time               `json:"updatedAt"`
	OrderNo             string                  `json:"orderNo"`
	SourceType          string                  `json:"sourceType"`
	SourceID            string                  `json:"sourceId"`
	SourceNo            string                  `json:"sourceNo"`
	CustomerID          string                  `json:"customerId"`
	CustomerName        string                  `json:"customerName"`
	PartnerID           string                  `json:"partnerId"`
	PartnerNameSnapshot string                  `json:"partnerNameSnapshot"`
	Status              string                  `json:"status"`
	PlannedSendDate     string                  `json:"plannedSendDate"`
	PlannedReturnDate   string                  `json:"plannedReturnDate"`
	TotalQuantity       float64                 `json:"totalQuantity"`
	UOM                 string                  `json:"uom"`
	Notes               string                  `json:"notes"`
	Operator            string                  `json:"operator"`
	Version             int64                   `json:"version"`
	Lines               []OutsourceOrderLineDTO `json:"lines"`
}

type OutsourceOrderListQuery struct {
	Search     string
	Status     string
	SourceType string
	PartnerID  string
}

type OutsourceOrderListStats struct {
	Total      int `json:"total"`
	Draft      int `json:"draft"`
	Released   int `json:"released"`
	Active     int `json:"active"`
	Returned   int `json:"returned"`
	Closed     int `json:"closed"`
	Canceled   int `json:"canceled"`
	Manual     int `json:"manual"`
	SalesOrder int `json:"salesOrder"`
	Production int `json:"production"`
}

type OutsourceOrderListResponse struct {
	Items    []OutsourceOrderDTO     `json:"items"`
	Metadata OutsourceOrderListStats `json:"metadata"`
}

func mapOutsourceOrderLineToDTO(line models.OutsourceOrderLine) OutsourceOrderLineDTO {
	return OutsourceOrderLineDTO{
		ID:               line.ID,
		CreatedAt:        line.CreatedAt,
		UpdatedAt:        line.UpdatedAt,
		OutsourceOrderID: line.OutsourceOrderID,
		LineNo:           line.LineNo,
		SourceLineID:     line.SourceLineID,
		ProductID:        line.ProductID,
		ProductCode:      line.ProductCode,
		ProductName:      line.ProductName,
		Specification:    line.Specification,
		Quantity:         line.Quantity,
		UOM:              line.UOM,
		SegmentID:        line.SegmentID,
		SegmentName:      line.SegmentName,
		ProcessStepID:    line.ProcessStepID,
		ProcessCode:      line.ProcessCode,
		ProcessName:      line.ProcessName,
		Status:           line.Status,
		Notes:            line.Notes,
		Version:          line.Version,
	}
}

func mapOutsourceOrderLinesToDTO(lines []models.OutsourceOrderLine) []OutsourceOrderLineDTO {
	result := make([]OutsourceOrderLineDTO, 0, len(lines))
	for _, line := range lines {
		result = append(result, mapOutsourceOrderLineToDTO(line))
	}
	return result
}

func mapOutsourceOrderToDTO(order models.OutsourceOrder) OutsourceOrderDTO {
	return OutsourceOrderDTO{
		ID:                  order.ID,
		CreatedAt:           order.CreatedAt,
		UpdatedAt:           order.UpdatedAt,
		OrderNo:             order.OrderNo,
		SourceType:          order.SourceType,
		SourceID:            order.SourceID,
		SourceNo:            order.SourceNo,
		CustomerID:          order.CustomerID,
		CustomerName:        order.CustomerName,
		PartnerID:           order.PartnerID,
		PartnerNameSnapshot: order.PartnerNameSnapshot,
		Status:              order.Status,
		PlannedSendDate:     formatOutsourceOrderDate(order.PlannedSendDate),
		PlannedReturnDate:   formatOutsourceOrderDate(order.PlannedReturnDate),
		TotalQuantity:       order.TotalQuantity,
		UOM:                 order.UOM,
		Notes:               order.Notes,
		Operator:            order.Operator,
		Version:             order.Version,
		Lines:               mapOutsourceOrderLinesToDTO(order.Lines),
	}
}

func mapOutsourceOrdersToDTO(orders []models.OutsourceOrder) []OutsourceOrderDTO {
	result := make([]OutsourceOrderDTO, 0, len(orders))
	for _, order := range orders {
		result = append(result, mapOutsourceOrderToDTO(order))
	}
	return result
}

func mapOutsourceOrderLineDTOToModel(line OutsourceOrderLineDTO) models.OutsourceOrderLine {
	return models.OutsourceOrderLine{
		BaseModel: models.BaseModel{
			ID:        line.ID,
			CreatedAt: line.CreatedAt,
			UpdatedAt: line.UpdatedAt,
		},
		OutsourceOrderID: line.OutsourceOrderID,
		LineNo:           line.LineNo,
		SourceLineID:     line.SourceLineID,
		ProductID:        line.ProductID,
		ProductCode:      line.ProductCode,
		ProductName:      line.ProductName,
		Specification:    line.Specification,
		Quantity:         line.Quantity,
		UOM:              line.UOM,
		SegmentID:        line.SegmentID,
		SegmentName:      line.SegmentName,
		ProcessStepID:    line.ProcessStepID,
		ProcessCode:      line.ProcessCode,
		ProcessName:      line.ProcessName,
		Status:           line.Status,
		Notes:            line.Notes,
		Version:          line.Version,
	}
}

func mapOutsourceOrderLinesDTOToModel(lines []OutsourceOrderLineDTO) []models.OutsourceOrderLine {
	result := make([]models.OutsourceOrderLine, 0, len(lines))
	for _, line := range lines {
		result = append(result, mapOutsourceOrderLineDTOToModel(line))
	}
	return result
}

func mapOutsourceOrderDTOToModel(order OutsourceOrderDTO) models.OutsourceOrder {
	return models.OutsourceOrder{
		BaseModel: models.BaseModel{
			ID:        order.ID,
			CreatedAt: order.CreatedAt,
			UpdatedAt: order.UpdatedAt,
		},
		OrderNo:             order.OrderNo,
		SourceType:          order.SourceType,
		SourceID:            order.SourceID,
		SourceNo:            order.SourceNo,
		CustomerID:          order.CustomerID,
		CustomerName:        order.CustomerName,
		PartnerID:           order.PartnerID,
		PartnerNameSnapshot: order.PartnerNameSnapshot,
		Status:              order.Status,
		TotalQuantity:       order.TotalQuantity,
		UOM:                 order.UOM,
		Notes:               order.Notes,
		Operator:            order.Operator,
		Version:             order.Version,
		Lines:               mapOutsourceOrderLinesDTOToModel(order.Lines),
	}
}

func applyOutsourceOrderDTO(order *models.OutsourceOrder, dto OutsourceOrderDTO) {
	order.OrderNo = dto.OrderNo
	order.SourceType = dto.SourceType
	order.SourceID = dto.SourceID
	order.SourceNo = dto.SourceNo
	order.CustomerID = dto.CustomerID
	order.CustomerName = dto.CustomerName
	order.PartnerID = dto.PartnerID
	order.PartnerNameSnapshot = dto.PartnerNameSnapshot
	order.Status = dto.Status
	order.TotalQuantity = dto.TotalQuantity
	order.UOM = dto.UOM
	order.Notes = dto.Notes
	order.Lines = mapOutsourceOrderLinesDTOToModel(dto.Lines)
}

func formatOutsourceOrderDate(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.Format("2006-01-02")
}

func buildOutsourceOrderListStats(items []OutsourceOrderDTO) OutsourceOrderListStats {
	stats := OutsourceOrderListStats{Total: len(items)}
	for _, item := range items {
		switch item.Status {
		case OutsourceOrderStatusDraft:
			stats.Draft++
		case OutsourceOrderStatusReleased:
			stats.Released++
		case OutsourceOrderStatusSent, OutsourceOrderStatusInProcess:
			stats.Active++
		case OutsourceOrderStatusReturned:
			stats.Returned++
		case OutsourceOrderStatusClosed:
			stats.Closed++
		case OutsourceOrderStatusCanceled:
			stats.Canceled++
		}

		switch item.SourceType {
		case OutsourceOrderSourceManual:
			stats.Manual++
		case OutsourceOrderSourceSalesOrder:
			stats.SalesOrder++
		case OutsourceOrderSourceProductionPlan:
			stats.Production++
		}
	}
	return stats
}

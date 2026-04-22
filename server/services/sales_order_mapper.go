package services

import (
	"math"
	"xdfc-server/models"
)

func mapSalesOrderLineRequestToModel(line SalesOrderLineRequest) models.SalesOrderLine {
	return models.SalesOrderLine{
		ID:             line.ID,
		LineNo:         line.LineNo,
		ProductID:      line.ProductID,
		ProductModel:   line.ProductModel,
		ProductCode:    line.ProductCode,
		Specification:  line.Specification,
		Description:    line.Description,
		Qty:            line.Qty,
		UOM:            line.UOM,
		Price:          line.Price,
		Amount:         line.Amount,
		DeliveredQty:   line.DeliveredQty,
		CustomerPartNo: line.CustomerPartNo,
		JobNo:          line.JobNo,
		Note:           line.Note,
		DrillingPlanID: line.DrillingPlanID,
		LabelingPlanID: line.LabelingPlanID,
		HoleCount:      line.HoleCount,
		Route:          line.Route,
		OrderDate:      line.OrderDate,
		Status:         line.Status,
		ClaimedBy:      line.ClaimedBy,
		ClaimedAt:      line.ClaimedAt,
	}
}

func MapSaveSalesOrderRequestToModel(input SaveSalesOrderRequest) models.SalesOrder {
	lines := make([]models.SalesOrderLine, 0, len(input.Lines))
	for _, line := range input.Lines {
		lines = append(lines, mapSalesOrderLineRequestToModel(line))
	}
	return models.SalesOrder{
		ID:                 input.ID,
		OrderNo:            input.OrderNo,
		OrderName:          input.OrderName,
		CustomerName:       input.CustomerName,
		CustomerID:         input.CustomerID,
		Type:               input.Type,
		Currency:           input.Currency,
		PaymentMethod:      input.PaymentMethod,
		PaymentMethodName:  input.PaymentMethodName,
		PaymentTerm:        input.PaymentTerm,
		PaymentTermName:    input.PaymentTermName,
		Classification:     input.Classification,
		Status:             input.Status,
		StatusNote:         input.StatusNote,
		Amount:             input.Amount,
		Quantity:           input.Quantity,
		OrderDate:          input.OrderDate,
		DeliveryDate:       input.DeliveryDate,
		PurchaseOrderNo:    input.PurchaseOrderNo,
		Barcode:            input.Barcode,
		Requirements:       input.Requirements,
		Evidences:          encodeOrderEvidences(input.Evidences),
		WorkflowInstanceID: input.WorkflowInstanceID,
		UpdatedBy:          input.UpdatedBy,
		IsDeleted:          input.IsDeleted,
		Version:            input.Version,
		Lines:              lines,
	}
}

func MapSalesOrderToResponse(order models.SalesOrder) SalesOrderResponse {
	return MapSalesOrderToResponseWithReturnMetrics(order, nil)
}

func MapSalesOrderSnapshotRequestToModel(input SalesOrderSnapshotRequest) models.SalesOrder {
	lines := make([]models.SalesOrderLine, 0, len(input.Lines))
	for _, line := range input.Lines {
		lines = append(lines, mapSalesOrderLineRequestToModel(line))
	}
	return models.SalesOrder{
		ID:                 input.ID,
		OrderNo:            input.OrderNo,
		OrderName:          input.OrderName,
		CustomerName:       input.CustomerName,
		CustomerID:         input.CustomerID,
		Type:               input.Type,
		Currency:           input.Currency,
		PaymentMethod:      input.PaymentMethod,
		PaymentMethodName:  input.PaymentMethodName,
		PaymentTerm:        input.PaymentTerm,
		PaymentTermName:    input.PaymentTermName,
		Classification:     input.Classification,
		Status:             input.Status,
		StatusNote:         input.StatusNote,
		Amount:             input.Amount,
		Quantity:           input.Quantity,
		OrderDate:          input.OrderDate,
		DeliveryDate:       input.DeliveryDate,
		PurchaseOrderNo:    input.PurchaseOrderNo,
		Barcode:            input.Barcode,
		Requirements:       input.Requirements,
		Evidences:          encodeOrderEvidences(input.Evidences),
		WorkflowInstanceID: input.WorkflowInstanceID,
		UpdatedBy:          input.UpdatedBy,
		IsDeleted:          input.IsDeleted,
		Version:            input.Version,
		Lines:              lines,
	}
}

func mapSalesOrderLineToResponseWithReturnMetrics(line models.SalesOrderLine, returnedQuantityMap map[uint]float64) SalesOrderLineResponse {
	returnedQuantity := 0.0
	if returnedQuantityMap != nil {
		returnedQuantity = math.Round(returnedQuantityMap[line.ID]*100) / 100
	}
	remainingReturnableQuantity := math.Round((line.Qty-returnedQuantity)*100) / 100
	if remainingReturnableQuantity < purchaseReceiptTolerance {
		remainingReturnableQuantity = 0
	}

	return SalesOrderLineResponse{
		ID:                          line.ID,
		LineNo:                      line.LineNo,
		ProductID:                   line.ProductID,
		ProductModel:                line.ProductModel,
		ProductCode:                 line.ProductCode,
		Specification:               line.Specification,
		Description:                 line.Description,
		Qty:                         math.Round(line.Qty*100) / 100,
		UOM:                         line.UOM,
		Price:                       math.Round(line.Price*100) / 100,
		Amount:                      math.Round(line.Amount*100) / 100,
		DeliveredQty:                math.Round(line.DeliveredQty*100) / 100,
		CustomerPartNo:              line.CustomerPartNo,
		JobNo:                       line.JobNo,
		Note:                        line.Note,
		DrillingPlanID:              line.DrillingPlanID,
		LabelingPlanID:              line.LabelingPlanID,
		HoleCount:                   line.HoleCount,
		Route:                       line.Route,
		OrderDate:                   line.OrderDate,
		Status:                      line.Status,
		ClaimedBy:                   line.ClaimedBy,
		ClaimedAt:                   line.ClaimedAt,
		ReturnedQuantity:            returnedQuantity,
		RemainingReturnableQuantity: remainingReturnableQuantity,
	}
}

func mapSalesOrderLineToResponse(line models.SalesOrderLine) SalesOrderLineResponse {
	return mapSalesOrderLineToResponseWithReturnMetrics(line, nil)
}

func mapSalesOrderLineResponseToRequest(line SalesOrderLineResponse) SalesOrderLineRequest {
	return SalesOrderLineRequest{
		ID:             line.ID,
		LineNo:         line.LineNo,
		ProductID:      line.ProductID,
		ProductModel:   line.ProductModel,
		ProductCode:    line.ProductCode,
		Specification:  line.Specification,
		Description:    line.Description,
		Qty:            line.Qty,
		UOM:            line.UOM,
		Price:          line.Price,
		Amount:         line.Amount,
		DeliveredQty:   line.DeliveredQty,
		CustomerPartNo: line.CustomerPartNo,
		JobNo:          line.JobNo,
		Note:           line.Note,
		DrillingPlanID: line.DrillingPlanID,
		LabelingPlanID: line.LabelingPlanID,
		HoleCount:      line.HoleCount,
		Route:          line.Route,
		OrderDate:      line.OrderDate,
		Status:         line.Status,
		ClaimedBy:      line.ClaimedBy,
		ClaimedAt:      line.ClaimedAt,
	}
}

func MapSalesOrderToResponseWithReturnMetrics(order models.SalesOrder, returnedQuantityMap map[uint]float64) SalesOrderResponse {
	lines := make([]SalesOrderLineResponse, 0, len(order.Lines))
	for _, line := range order.Lines {
		lines = append(lines, mapSalesOrderLineToResponseWithReturnMetrics(line, returnedQuantityMap))
	}
	return SalesOrderResponse{
		ID:                 order.ID,
		OrderNo:            order.OrderNo,
		OrderName:          order.OrderName,
		CustomerName:       order.CustomerName,
		CustomerID:         order.CustomerID,
		Type:               order.Type,
		Currency:           order.Currency,
		PaymentMethod:      order.PaymentMethod,
		PaymentMethodName:  order.PaymentMethodName,
		PaymentTerm:        order.PaymentTerm,
		PaymentTermName:    order.PaymentTermName,
		Classification:     order.Classification,
		Status:             order.Status,
		StatusNote:         order.StatusNote,
		Amount:             order.Amount,
		Quantity:           order.Quantity,
		OrderDate:          order.OrderDate,
		DeliveryDate:       order.DeliveryDate,
		PurchaseOrderNo:    order.PurchaseOrderNo,
		Barcode:            order.Barcode,
		Requirements:       order.Requirements,
		Evidences:          decodeOrderEvidences(order.Evidences),
		WorkflowInstanceID: order.WorkflowInstanceID,
		CreatedAt:          order.CreatedAt,
		UpdatedAt:          order.UpdatedAt,
		UpdatedBy:          order.UpdatedBy,
		IsDeleted:          order.IsDeleted,
		Version:            order.Version,
		FulfillmentRate:    calculateSalesOrderFulfillmentRate(order),
		Lines:              lines,
	}
}

func MapSalesOrderResponseToSnapshot(order SalesOrderResponse) SalesOrderSnapshotRequest {
	lines := make([]SalesOrderLineRequest, 0, len(order.Lines))
	for _, line := range order.Lines {
		lines = append(lines, mapSalesOrderLineResponseToRequest(line))
	}
	return SalesOrderSnapshotRequest{
		ID:                 order.ID,
		OrderNo:            order.OrderNo,
		OrderName:          order.OrderName,
		CustomerName:       order.CustomerName,
		CustomerID:         order.CustomerID,
		Type:               order.Type,
		Currency:           order.Currency,
		PaymentMethod:      order.PaymentMethod,
		PaymentMethodName:  order.PaymentMethodName,
		PaymentTerm:        order.PaymentTerm,
		PaymentTermName:    order.PaymentTermName,
		Classification:     order.Classification,
		Status:             order.Status,
		StatusNote:         order.StatusNote,
		Amount:             order.Amount,
		Quantity:           order.Quantity,
		OrderDate:          order.OrderDate,
		DeliveryDate:       order.DeliveryDate,
		PurchaseOrderNo:    order.PurchaseOrderNo,
		Barcode:            order.Barcode,
		Requirements:       order.Requirements,
		Evidences:          order.Evidences,
		WorkflowInstanceID: order.WorkflowInstanceID,
		UpdatedBy:          order.UpdatedBy,
		IsDeleted:          order.IsDeleted,
		Version:            order.Version,
		Lines:              lines,
	}
}

func MapSalesOrdersToListItemsWithReturnMetrics(orders []models.SalesOrder, includeLines bool, returnedQuantityMap map[uint]float64) []SalesOrderListItemResponse {
	items := make([]SalesOrderListItemResponse, 0, len(orders))
	for _, order := range orders {
		var lines *[]SalesOrderLineResponse
		if includeLines {
			mappedLines := make([]SalesOrderLineResponse, 0, len(order.Lines))
			for _, line := range order.Lines {
				mappedLines = append(mappedLines, mapSalesOrderLineToResponseWithReturnMetrics(line, returnedQuantityMap))
			}
			lines = &mappedLines
		}
		items = append(items, SalesOrderListItemResponse{
			ID:                 order.ID,
			OrderNo:            order.OrderNo,
			OrderName:          order.OrderName,
			CustomerName:       order.CustomerName,
			CustomerID:         order.CustomerID,
			Type:               order.Type,
			Currency:           order.Currency,
			PaymentMethod:      order.PaymentMethod,
			PaymentMethodName:  order.PaymentMethodName,
			PaymentTerm:        order.PaymentTerm,
			PaymentTermName:    order.PaymentTermName,
			Classification:     order.Classification,
			Status:             order.Status,
			StatusNote:         order.StatusNote,
			Amount:             order.Amount,
			Quantity:           order.Quantity,
			OrderDate:          order.OrderDate,
			DeliveryDate:       order.DeliveryDate,
			PurchaseOrderNo:    order.PurchaseOrderNo,
			Barcode:            order.Barcode,
			Requirements:       order.Requirements,
			Evidences:          decodeOrderEvidences(order.Evidences),
			WorkflowInstanceID: order.WorkflowInstanceID,
			CreatedAt:          order.CreatedAt,
			UpdatedAt:          order.UpdatedAt,
			UpdatedBy:          order.UpdatedBy,
			IsDeleted:          order.IsDeleted,
			Version:            order.Version,
			FulfillmentRate:    calculateSalesOrderFulfillmentRate(order),
			Lines:              lines,
		})
	}
	return items
}

func MapSalesOrdersToListItems(orders []models.SalesOrder, includeLines bool) []SalesOrderListItemResponse {
	return MapSalesOrdersToListItemsWithReturnMetrics(orders, includeLines, nil)
}

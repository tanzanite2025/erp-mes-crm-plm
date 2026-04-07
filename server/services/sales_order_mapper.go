package services

import "xdfc-server/models"

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
		WorkflowInstanceID: input.WorkflowInstanceID,
		UpdatedBy:          input.UpdatedBy,
		IsDeleted:          input.IsDeleted,
		Version:            input.Version,
		Lines:              lines,
	}
}

func MapPatchSalesOrderRequestToModel(input PatchSalesOrderRequest) models.SalesOrder {
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
		WorkflowInstanceID: input.WorkflowInstanceID,
		UpdatedBy:          input.UpdatedBy,
		IsDeleted:          input.IsDeleted,
		Version:            input.Version,
		Lines:              lines,
	}
}

func mapSalesOrderLineToResponse(line models.SalesOrderLine) SalesOrderLineResponse {
	return SalesOrderLineResponse{
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

func MapSalesOrderToResponse(order models.SalesOrder) SalesOrderResponse {
	lines := make([]SalesOrderLineResponse, 0, len(order.Lines))
	for _, line := range order.Lines {
		lines = append(lines, mapSalesOrderLineToResponse(line))
	}
	return SalesOrderResponse{
		ID:                 order.ID,
		OrderNo:            order.OrderNo,
		OrderName:          order.OrderName,
		CustomerName:       order.CustomerName,
		CustomerID:         order.CustomerID,
		Type:               order.Type,
		Currency:           order.Currency,
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
		WorkflowInstanceID: order.WorkflowInstanceID,
		CreatedAt:          order.CreatedAt,
		UpdatedAt:          order.UpdatedAt,
		UpdatedBy:          order.UpdatedBy,
		IsDeleted:          order.IsDeleted,
		Version:            order.Version,
		Lines:              lines,
	}
}

func MapSalesOrdersToListItems(orders []models.SalesOrder) []SalesOrderListItemResponse {
	items := make([]SalesOrderListItemResponse, 0, len(orders))
	for _, order := range orders {
		lines := make([]SalesOrderLineResponse, 0, len(order.Lines))
		for _, line := range order.Lines {
			lines = append(lines, mapSalesOrderLineToResponse(line))
		}
		items = append(items, SalesOrderListItemResponse{
			ID:                 order.ID,
			OrderNo:            order.OrderNo,
			OrderName:          order.OrderName,
			CustomerName:       order.CustomerName,
			CustomerID:         order.CustomerID,
			Type:               order.Type,
			Currency:           order.Currency,
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
			WorkflowInstanceID: order.WorkflowInstanceID,
			CreatedAt:          order.CreatedAt,
			UpdatedAt:          order.UpdatedAt,
			UpdatedBy:          order.UpdatedBy,
			IsDeleted:          order.IsDeleted,
			Version:            order.Version,
			Lines:              lines,
		})
	}
	return items
}

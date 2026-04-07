package services

import "xdfc-server/models"

func MapSaveSupplierRequestToModel(input SaveSupplierRequest) models.Supplier {
	return models.Supplier{
		ID:            input.ID,
		Name:          input.Name,
		Code:          input.Code,
		Category:      input.Category,
		MainProducts:  input.MainProducts,
		ContactPerson: input.ContactPerson,
		ContactPhone:  input.ContactPhone,
		Email:         input.Email,
		Address:       input.Address,
		Status:        input.Status,
		Rating:        input.Rating,
		Version:       input.Version,
	}
}

func ApplyPatchSupplierRequestToModel(target *models.Supplier, patch PatchSupplierRequest) {
	if patch.Name != nil {
		target.Name = *patch.Name
	}
	if patch.Code != nil {
		target.Code = *patch.Code
	}
	if patch.Category != nil {
		target.Category = *patch.Category
	}
	if patch.MainProducts != nil {
		target.MainProducts = *patch.MainProducts
	}
	if patch.ContactPerson != nil {
		target.ContactPerson = *patch.ContactPerson
	}
	if patch.ContactPhone != nil {
		target.ContactPhone = *patch.ContactPhone
	}
	if patch.Email != nil {
		target.Email = *patch.Email
	}
	if patch.Address != nil {
		target.Address = *patch.Address
	}
	if patch.Status != nil {
		target.Status = *patch.Status
	}
	if patch.Rating != nil {
		target.Rating = *patch.Rating
	}
	if patch.Version != 0 {
		target.Version = patch.Version
	}
}

func mapPurchaseOrderLineRequestToModel(line PurchaseOrderLineRequest) models.PurchaseOrderLine {
	return models.PurchaseOrderLine{
		ID:            line.ID,
		LineNo:        line.LineNo,
		MaterialID:    line.MaterialID,
		MaterialCode:  line.MaterialCode,
		MaterialName:  line.MaterialName,
		Specification: line.Specification,
		Qty:           line.Qty,
		UOM:           line.UOM,
		Price:         line.Price,
		Amount:        line.Amount,
		ReceivedQty:   line.ReceivedQty,
		Status:        line.Status,
	}
}

func MapSavePurchaseOrderRequestToModel(input SavePurchaseOrderRequest) models.PurchaseOrder {
	lines := make([]models.PurchaseOrderLine, 0, len(input.Lines))
	for _, line := range input.Lines {
		lines = append(lines, mapPurchaseOrderLineRequestToModel(line))
	}
	return models.PurchaseOrder{
		ID:                 input.ID,
		OrderNo:            input.OrderNo,
		SupplierID:         input.SupplierID,
		SupplierName:       input.SupplierName,
		OrderDate:          input.OrderDate,
		ExpectedDate:       input.ExpectedDate,
		Status:             input.Status,
		Currency:           input.Currency,
		Amount:             input.Amount,
		ExchangeRate:       input.ExchangeRate,
		Purchaser:          input.Purchaser,
		PaymentTerm:        input.PaymentTerm,
		Note:               input.Note,
		WorkflowInstanceID: input.WorkflowInstanceID,
		IsDeleted:          input.IsDeleted,
		Version:            input.Version,
		Lines:              lines,
	}
}

func MapPatchPurchaseOrderRequestToModel(input PatchPurchaseOrderRequest) models.PurchaseOrder {
	lines := make([]models.PurchaseOrderLine, 0, len(input.Lines))
	for _, line := range input.Lines {
		lines = append(lines, mapPurchaseOrderLineRequestToModel(line))
	}
	return models.PurchaseOrder{
		ID:                 input.ID,
		OrderNo:            input.OrderNo,
		SupplierID:         input.SupplierID,
		SupplierName:       input.SupplierName,
		OrderDate:          input.OrderDate,
		ExpectedDate:       input.ExpectedDate,
		Status:             input.Status,
		Currency:           input.Currency,
		Amount:             input.Amount,
		ExchangeRate:       input.ExchangeRate,
		Purchaser:          input.Purchaser,
		PaymentTerm:        input.PaymentTerm,
		Note:               input.Note,
		WorkflowInstanceID: input.WorkflowInstanceID,
		IsDeleted:          input.IsDeleted,
		Version:            input.Version,
		Lines:              lines,
	}
}

func mapPurchaseOrderLineToResponse(line models.PurchaseOrderLine) PurchaseOrderLineResponse {
	return PurchaseOrderLineResponse{
		ID:            line.ID,
		LineNo:        line.LineNo,
		MaterialID:    line.MaterialID,
		MaterialCode:  line.MaterialCode,
		MaterialName:  line.MaterialName,
		Specification: line.Specification,
		Qty:           line.Qty,
		UOM:           line.UOM,
		Price:         line.Price,
		Amount:        line.Amount,
		ReceivedQty:   line.ReceivedQty,
		Status:        line.Status,
	}
}

func MapPurchaseOrderToResponse(order models.PurchaseOrder) PurchaseOrderResponse {
	lines := make([]PurchaseOrderLineResponse, 0, len(order.Lines))
	for _, line := range order.Lines {
		lines = append(lines, mapPurchaseOrderLineToResponse(line))
	}
	return PurchaseOrderResponse{
		ID:                 order.ID,
		OrderNo:            order.OrderNo,
		SupplierID:         order.SupplierID,
		SupplierName:       order.SupplierName,
		OrderDate:          order.OrderDate,
		ExpectedDate:       order.ExpectedDate,
		Status:             order.Status,
		Currency:           order.Currency,
		Amount:             order.Amount,
		ExchangeRate:       order.ExchangeRate,
		Purchaser:          order.Purchaser,
		PaymentTerm:        order.PaymentTerm,
		Note:               order.Note,
		WorkflowInstanceID: order.WorkflowInstanceID,
		CreatedAt:          order.CreatedAt,
		UpdatedAt:          order.UpdatedAt,
		IsDeleted:          order.IsDeleted,
		Version:            order.Version,
		Lines:              lines,
	}
}

func MapPurchaseOrdersToListItems(orders []models.PurchaseOrder) []PurchaseOrderListItemResponse {
	items := make([]PurchaseOrderListItemResponse, 0, len(orders))
	for _, order := range orders {
		items = append(items, PurchaseOrderListItemResponse{
			ID:                 order.ID,
			OrderNo:            order.OrderNo,
			SupplierID:         order.SupplierID,
			SupplierName:       order.SupplierName,
			OrderDate:          order.OrderDate,
			ExpectedDate:       order.ExpectedDate,
			Status:             order.Status,
			Currency:           order.Currency,
			Amount:             order.Amount,
			ExchangeRate:       order.ExchangeRate,
			Purchaser:          order.Purchaser,
			PaymentTerm:        order.PaymentTerm,
			Note:               order.Note,
			WorkflowInstanceID: order.WorkflowInstanceID,
			CreatedAt:          order.CreatedAt,
			UpdatedAt:          order.UpdatedAt,
			IsDeleted:          order.IsDeleted,
			Version:            order.Version,
		})
	}
	return items
}

func mapInboundRecordToResponse(record models.InboundRecord) InboundRecordResponse {
	return InboundRecordResponse{
		ID:                  record.ID,
		MaterialID:          record.MaterialID,
		MaterialName:        record.MaterialName,
		MaterialCode:        record.MaterialCode,
		PurchaseOrderID:     record.PurchaseOrderID,
		PurchaseOrderLineID: record.PurchaseOrderLineID,
		Quantity:            record.Quantity,
		PurchasePrice:       record.PurchasePrice,
		TargetCategory:      record.TargetCategory,
		BatchNo:             record.BatchNo,
		InboundDate:         record.InboundDate,
		Operator:            record.Operator,
		Remarks:             record.Remarks,
		CreatedAt:           record.CreatedAt,
		UpdatedAt:           record.UpdatedAt,
	}
}

func mapInboundRecordsToResponse(records []models.InboundRecord) []InboundRecordResponse {
	items := make([]InboundRecordResponse, 0, len(records))
	for _, record := range records {
		items = append(items, mapInboundRecordToResponse(record))
	}
	return items
}

func MapConfirmPurchaseReceiptRequestToInput(request ConfirmPurchaseReceiptRequest, purchaseOrderID string, operator string, receiptDate string) ConfirmPurchaseReceiptInput {
	lines := make([]ConfirmPurchaseReceiptLineInput, 0, len(request.Lines))
	for _, line := range request.Lines {
		lines = append(lines, ConfirmPurchaseReceiptLineInput{
			PurchaseOrderLineID: line.PurchaseOrderLineID,
			MaterialID:          line.MaterialID,
			Quantity:            line.Quantity,
			PurchasePrice:       line.PurchasePrice,
			BatchNo:             line.BatchNo,
			TargetCategory:      line.TargetCategory,
		})
	}

	return ConfirmPurchaseReceiptInput{
		PurchaseOrderID: purchaseOrderID,
		Operator:        operator,
		Remarks:         request.Remarks,
		ReceiptDateRaw:  receiptDate,
		Lines:           lines,
	}
}

func MapConfirmPurchaseReceiptResultToResponse(result ConfirmPurchaseReceiptResult) ConfirmPurchaseReceiptResponse {
	return ConfirmPurchaseReceiptResponse{
		PurchaseOrder:         MapPurchaseOrderToResponse(result.PurchaseOrder),
		CreatedInboundRecords: mapInboundRecordsToResponse(result.CreatedInboundRecords),
	}
}

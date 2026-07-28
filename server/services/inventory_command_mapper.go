package services

import "xdfc-server/models"

func ApplyPatchInventoryRequestToModel(target *models.Inventory, patch PatchInventoryRequest) {
	if patch.MaterialID != nil {
		target.MaterialID = *patch.MaterialID
	}
	if patch.MaterialName != nil {
		target.MaterialName = *patch.MaterialName
	}
	if patch.MaterialCode != nil {
		target.MaterialCode = *patch.MaterialCode
	}
	if patch.MaterialSpec != nil {
		target.MaterialSpec = *patch.MaterialSpec
	}
	if patch.Quantity != nil {
		target.Quantity = *patch.Quantity
	}
	if patch.TotalValue != nil {
		target.TotalValue = *patch.TotalValue
	}
	if patch.AverageUnitCost != nil {
		target.AverageUnitCost = *patch.AverageUnitCost
	}
	if patch.CategoryCode != nil {
		target.CategoryCode = *patch.CategoryCode
	}
	if patch.BatchNo != nil {
		target.BatchNo = *patch.BatchNo
	}
	if patch.UOM != nil {
		target.UOM = *patch.UOM
	}
}

func ApplyPatchShipmentRequestToModel(target *models.ShipmentRecord, patch PatchShipmentRequest) {
	if patch.MaterialID != nil {
		target.MaterialID = *patch.MaterialID
	}
	if patch.MaterialName != nil {
		target.MaterialName = *patch.MaterialName
	}
	if patch.MaterialCode != nil {
		target.MaterialCode = *patch.MaterialCode
	}
	if patch.SalesOrderID != nil {
		target.SalesOrderID = *patch.SalesOrderID
	}
	if patch.SalesOrderLineID != nil {
		target.SalesOrderLineID = *patch.SalesOrderLineID
	}
	if patch.Quantity != nil {
		target.Quantity = *patch.Quantity
	}
	if patch.SourceCategory != nil {
		target.SourceCategory = *patch.SourceCategory
	}
	if patch.BatchNo != nil {
		target.BatchNo = *patch.BatchNo
	}
	if patch.OrderNo != nil {
		target.OrderNo = *patch.OrderNo
	}
	if patch.ShipmentDate != nil {
		target.ShipmentDate = *patch.ShipmentDate
	}
	if patch.Operator != nil {
		target.Operator = *patch.Operator
	}
	if patch.Remarks != nil {
		target.Remarks = *patch.Remarks
	}
}

func MapRecordInboundRequestToModel(input RecordInboundRequest) models.InboundRecord {
	return models.InboundRecord{
		MaterialID:          input.MaterialID,
		MaterialName:        input.MaterialName,
		MaterialCode:        input.MaterialCode,
		SourceType:          input.SourceType,
		SourceID:            input.SourceID,
		SourceLineID:        input.SourceLineID,
		PurchaseOrderID:     input.PurchaseOrderID,
		PurchaseOrderLineID: input.PurchaseOrderLineID,
		Quantity:            input.Quantity,
		PurchasePrice:       input.PurchasePrice,
		TargetCategory:      input.TargetCategory,
		BatchNo:             input.BatchNo,
		InboundDate:         input.InboundDate,
		Operator:            input.Operator,
		Remarks:             input.Remarks,
	}
}

func MapRecordShipmentRequestToModel(input RecordShipmentRequest) models.ShipmentRecord {
	return models.ShipmentRecord{
		MaterialID:       input.MaterialID,
		MaterialName:     input.MaterialName,
		MaterialCode:     input.MaterialCode,
		SourceType:       input.SourceType,
		SourceID:         input.SourceID,
		SourceLineID:     input.SourceLineID,
		SalesOrderID:     input.SalesOrderID,
		SalesOrderLineID: input.SalesOrderLineID,
		Quantity:         input.Quantity,
		SourceCategory:   input.SourceCategory,
		BatchNo:          input.BatchNo,
		OrderNo:          input.OrderNo,
		TrackingNo:       input.TrackingNo,
		Status:           input.Status,
		ShipmentDate:     input.ShipmentDate,
		Operator:         input.Operator,
		Remarks:          input.Remarks,
	}
}

func MapTransferInventoryRequestToInput(request TransferInventoryRequest) TransferInventoryInput {
	return TransferInventoryInput{
		MaterialID:   request.MaterialID,
		Quantity:     request.Quantity,
		FromCategory: request.FromCategory,
		ToCategory:   request.ToCategory,
		BatchNo:      request.BatchNo,
	}
}

func MapBulkSyncInventoryRequestsToModels(items []BulkSyncInventoryItemRequest) []models.Inventory {
	result := make([]models.Inventory, 0, len(items))
	for _, item := range items {
		result = append(result, models.Inventory{
			BaseModel:       models.BaseModel{ID: item.ID},
			MaterialID:      item.MaterialID,
			MaterialName:    item.MaterialName,
			MaterialCode:    item.MaterialCode,
			MaterialSpec:    item.MaterialSpec,
			Quantity:        item.Quantity,
			TotalValue:      item.TotalValue,
			AverageUnitCost: item.AverageUnitCost,
			CategoryCode:    item.CategoryCode,
			BatchNo:         item.BatchNo,
			UOM:             item.UOM,
		})
	}
	return result
}

func MapInboundRecordToResponse(record models.InboundRecord) InventoryInboundRecordResponse {
	return InventoryInboundRecordResponse{
		ID:                  record.ID,
		MaterialID:          record.MaterialID,
		MaterialName:        record.MaterialName,
		MaterialCode:        record.MaterialCode,
		SourceType:          record.SourceType,
		SourceID:            record.SourceID,
		SourceLineID:        record.SourceLineID,
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

func MapShipmentRecordToResponse(record models.ShipmentRecord) InventoryShipmentRecordResponse {
	return InventoryShipmentRecordResponse{
		ID:               record.ID,
		MaterialID:       record.MaterialID,
		MaterialName:     record.MaterialName,
		MaterialCode:     record.MaterialCode,
		SourceType:       record.SourceType,
		SourceID:         record.SourceID,
		SourceLineID:     record.SourceLineID,
		SalesOrderID:     record.SalesOrderID,
		SalesOrderLineID: record.SalesOrderLineID,
		Quantity:         record.Quantity,
		SourceCategory:   record.SourceCategory,
		BatchNo:          record.BatchNo,
		OrderNo:          record.OrderNo,
		TrackingNo:       record.TrackingNo,
		Status:           record.Status,
		COGS:             record.COGS,
		ShipmentDate:     record.ShipmentDate,
		Operator:         record.Operator,
		Remarks:          record.Remarks,
		CreatedAt:        record.CreatedAt,
		UpdatedAt:        record.UpdatedAt,
		Version:          optimisticVersionFromTimestamps(record.UpdatedAt, record.CreatedAt),
	}
}

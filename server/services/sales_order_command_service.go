package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type SaveSalesOrderCommand struct {
	Request  SaveSalesOrderRequest
	ActorID  string
	Operator string
	IP       string
}

type PatchSalesOrderCommand struct {
	OrderID  string
	Snapshot SalesOrderSnapshotRequest
	Delta    map[string]json.RawMessage
	ActorID  string
	Operator string
	IP       string
}

func SaveSalesOrder(command SaveSalesOrderCommand) (SalesOrderResponse, error) {
	input := MapSaveSalesOrderRequestToModel(command.Request)
	operator := strings.TrimSpace(command.Operator)
	if operator != "" {
		input.UpdatedBy = operator
	}

	isNew := input.ID == "" || len(input.ID) < 36
	originalID := input.ID
	if isNew {
		input.ID = ""
	}

	if isNew {
		created, err := createSalesOrderTx(input, originalID, strings.TrimSpace(command.ActorID))
		if err != nil {
			return SalesOrderResponse{}, err
		}
		return MapSalesOrderToResponse(*created), nil
	}

	payload, err := BuildSalesOrderSavePayload(MapSaveSalesOrderRequestToSnapshot(command.Request), buildSalesOrderSaveDelta(command.Request), operator)
	if err != nil {
		return SalesOrderResponse{}, err
	}

	return ExecuteSalesOrderTransaction(ExecuteSalesOrderTransactionInput{
		OrderID:         input.ID,
		Intent:          SalesTransactionIntentOrderSave,
		ActorID:         strings.TrimSpace(command.ActorID),
		Operator:        operator,
		ExpectedVersion: input.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(command.IP),
	})
}

func PatchSalesOrder(command PatchSalesOrderCommand) (SalesOrderResponse, error) {
	orderID := strings.TrimSpace(command.OrderID)
	if orderID == "" {
		return SalesOrderResponse{}, fmt.Errorf("sales order id is required")
	}
	if command.Snapshot.ID == "" {
		return SalesOrderResponse{}, fmt.Errorf("sales order snapshot id is required")
	}
	if len(command.Delta) == 0 {
		return SalesOrderResponse{}, fmt.Errorf("sales order delta is required")
	}

	payload, err := BuildSalesOrderSavePayload(command.Snapshot, command.Delta, strings.TrimSpace(command.Operator))
	if err != nil {
		return SalesOrderResponse{}, err
	}

	return ExecuteSalesOrderTransaction(ExecuteSalesOrderTransactionInput{
		OrderID:         orderID,
		Intent:          SalesTransactionIntentOrderSave,
		ActorID:         strings.TrimSpace(command.ActorID),
		Operator:        strings.TrimSpace(command.Operator),
		ExpectedVersion: command.Snapshot.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(command.IP),
	})
}

func createSalesOrderTx(input models.SalesOrder, originalID, requesterID string) (*models.SalesOrder, error) {
	var created models.SalesOrder
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, line := range input.Lines {
			var product models.Product
			if err := tx.Where("id = ?", line.ProductID).First(&product).Error; err != nil {
				var material models.Material
				if errM := tx.Where("id = ?", line.ProductID).First(&material).Error; errM != nil {
					return errors.New("[CRITICAL_DATA_INTEGRITY] 订单保存失败：明细行物料 ID " + line.ProductID + " 不存在")
				}
			}
		}

		input.Version = 1
		if input.OrderNo == "" && originalID != "" {
			input.OrderNo = originalID
		}
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		if _, err := RecalculateSalesOrderStatusTx(tx, input.ID); err != nil {
			return err
		}

		workflowInstance, err := CreateWorkflowInstanceForDocumentTx(
			tx,
			WorkflowModuleSalesOrder,
			"SALES_ORDER",
			input.ID,
			requesterID,
		)
		if err != nil {
			if errors.Is(err, ErrWorkflowDefinitionMissing) {
				created = input
				return nil
			}
			return err
		}

		input.WorkflowInstanceID = workflowInstance.ID
		if err := tx.Model(&input).Update("workflow_instance_id", workflowInstance.ID).Error; err != nil {
			return err
		}
		created = input
		return nil
	})
	if err != nil {
		return nil, err
	}
	if err := db.DB.Preload("Lines").First(&created, "id = ?", created.ID).Error; err != nil {
		return nil, err
	}
	return &created, nil
}

func buildSalesOrderSaveDelta(request SaveSalesOrderRequest) map[string]json.RawMessage {
	payload, _ := json.Marshal(request)
	var raw map[string]json.RawMessage
	_ = json.Unmarshal(payload, &raw)
	delete(raw, "id")
	delete(raw, "updatedBy")
	delete(raw, "workflowInstanceId")
	delete(raw, "_v")
	return raw
}

func BuildSalesOrderSavePayload(snapshot SalesOrderSnapshotRequest, delta map[string]json.RawMessage, operator string) (json.RawMessage, error) {
	payload, err := json.Marshal(SalesOrderSavePayload{
		Delta:     delta,
		FinalData: snapshot,
		Operator:  operator,
	})
	if err != nil {
		return nil, err
	}
	return payload, nil
}

func MapSaveSalesOrderRequestToSnapshot(input SaveSalesOrderRequest) SalesOrderSnapshotRequest {
	return SalesOrderSnapshotRequest{
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
		Lines:              input.Lines,
	}
}

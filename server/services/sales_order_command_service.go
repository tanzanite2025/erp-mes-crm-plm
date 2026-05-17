package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/salesorderidentity"
	"xdfc-server/services/trading_audit"

	"github.com/google/uuid"
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
	DeltaReq SDRTSDeltaHandlerRequest
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
		created, err := createSalesOrderTx(input, originalID, strings.TrimSpace(command.ActorID), strings.TrimSpace(command.Operator), strings.TrimSpace(command.IP))
		if err != nil {
			return SalesOrderResponse{}, err
		}
		response := MapSalesOrderToResponse(*created)
		syncSalesOrderToSearch(response)
		return response, nil
	}

	payload, err := BuildSalesOrderSavePayload(MapSaveSalesOrderRequestToSnapshot(command.Request), buildSalesOrderSaveDelta(command.Request), operator)
	if err != nil {
		return SalesOrderResponse{}, err
	}

	result, err := ExecuteSalesOrderTransaction(ExecuteSalesOrderTransactionInput{
		OrderID:         input.ID,
		Intent:          SalesTransactionIntentOrderSave,
		ActorID:         strings.TrimSpace(command.ActorID),
		Operator:        operator,
		ExpectedVersion: input.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(command.IP),
	})
	if err != nil {
		return SalesOrderResponse{}, err
	}
	if err := recordAuditEventTx(db.DB, trading_audit.BuildSalesOrderStatusChangeEvent(result.ID, "", result.Status, audit.AuditActor{UserID: strings.TrimSpace(command.ActorID), Username: operator, IP: strings.TrimSpace(command.IP), Source: "http"})); err != nil {
		return SalesOrderResponse{}, err
	}
	syncSalesOrderToSearch(result)
	return result, nil
}

func PatchSalesOrder(command PatchSalesOrderCommand) (SalesOrderResponse, error) {
	orderID := strings.TrimSpace(command.OrderID)
	snapshot := command.Snapshot
	delta := command.Delta
	if len(command.DeltaReq.Delta) > 0 {
		assembled, err := BuildSalesOrderPatchRequest(orderID, command.DeltaReq)
		if err != nil {
			return SalesOrderResponse{}, err
		}
		snapshot = assembled.Snapshot
		delta = assembled.Delta
	}
	if orderID == "" {
		return SalesOrderResponse{}, fmt.Errorf("sales order id is required")
	}
	if snapshot.ID == "" {
		return SalesOrderResponse{}, fmt.Errorf("sales order snapshot id is required")
	}
	if len(delta) == 0 {
		return SalesOrderResponse{}, fmt.Errorf("sales order delta is required")
	}

	payload, err := BuildSalesOrderSavePayload(snapshot, delta, strings.TrimSpace(command.Operator))
	if err != nil {
		return SalesOrderResponse{}, err
	}

	result, err := ExecuteSalesOrderTransaction(ExecuteSalesOrderTransactionInput{
		OrderID:         orderID,
		Intent:          SalesTransactionIntentOrderSave,
		ActorID:         strings.TrimSpace(command.ActorID),
		Operator:        strings.TrimSpace(command.Operator),
		ExpectedVersion: snapshot.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(command.IP),
	})
	if err != nil {
		return SalesOrderResponse{}, err
	}
	if err := recordAuditEventTx(db.DB, trading_audit.BuildSalesOrderStatusChangeEvent(result.ID, snapshot.Status, result.Status, audit.AuditActor{UserID: strings.TrimSpace(command.ActorID), Username: strings.TrimSpace(command.Operator), IP: strings.TrimSpace(command.IP), Source: "http"})); err != nil {
		return SalesOrderResponse{}, err
	}
	syncSalesOrderToSearch(result)
	return result, nil
}

func BuildSalesOrderPatchRequest(orderID string, req SDRTSDeltaHandlerRequest) (PatchSalesOrderCommand, error) {
	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "orderNo", "orderName", "customerName", "customerId", "type", "currency", "exchangeRateSnapshot", "paymentMethod", "paymentMethodName", "paymentTerm", "paymentTermName", "classification", "status", "statusNote", "orderDate", "deliveryDate", "purchaseOrderNo", "barcode", "requirements", "evidences", "isDeleted", "lines"); err != nil {
		return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta: %w", err)
	}

	existing, err := GetSalesOrderByID(strings.TrimSpace(orderID))
	if err != nil {
		return PatchSalesOrderCommand{}, err
	}

	snapshot := MapSalesOrderResponseToSnapshot(existing)
	snapshot.Version = int(req.Metadata.Version)

	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s: %w", key, err)
		}
		switch key {
		case "orderNo":
			if err := json.Unmarshal(valueRaw, &snapshot.OrderNo); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "orderName":
			if err := json.Unmarshal(valueRaw, &snapshot.OrderName); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "customerName":
			if err := json.Unmarshal(valueRaw, &snapshot.CustomerName); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "customerId":
			if err := json.Unmarshal(valueRaw, &snapshot.CustomerID); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "type":
			if err := json.Unmarshal(valueRaw, &snapshot.Type); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "currency":
			if err := json.Unmarshal(valueRaw, &snapshot.Currency); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "exchangeRateSnapshot":
			if err := json.Unmarshal(valueRaw, &snapshot.ExchangeRateSnapshot); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "paymentMethod":
			if err := json.Unmarshal(valueRaw, &snapshot.PaymentMethod); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "paymentMethodName":
			if err := json.Unmarshal(valueRaw, &snapshot.PaymentMethodName); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "paymentTerm":
			if err := json.Unmarshal(valueRaw, &snapshot.PaymentTerm); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "paymentTermName":
			if err := json.Unmarshal(valueRaw, &snapshot.PaymentTermName); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "classification":
			if err := json.Unmarshal(valueRaw, &snapshot.Classification); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "status":
			if err := json.Unmarshal(valueRaw, &snapshot.Status); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "statusNote":
			if err := json.Unmarshal(valueRaw, &snapshot.StatusNote); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "orderDate":
			if err := json.Unmarshal(valueRaw, &snapshot.OrderDate); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "deliveryDate":
			if err := json.Unmarshal(valueRaw, &snapshot.DeliveryDate); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "purchaseOrderNo":
			if err := json.Unmarshal(valueRaw, &snapshot.PurchaseOrderNo); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "barcode":
			if err := json.Unmarshal(valueRaw, &snapshot.Barcode); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "requirements":
			if err := json.Unmarshal(valueRaw, &snapshot.Requirements); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "evidences":
			if err := json.Unmarshal(valueRaw, &snapshot.Evidences); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "isDeleted":
			if err := json.Unmarshal(valueRaw, &snapshot.IsDeleted); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		case "lines":
			if err := json.Unmarshal(valueRaw, &snapshot.Lines); err != nil {
				return PatchSalesOrderCommand{}, fmt.Errorf("invalid sales order delta field %s", key)
			}
		}
	}

	return PatchSalesOrderCommand{
		OrderID:  strings.TrimSpace(orderID),
		Snapshot: snapshot,
		Delta:    req.Delta,
	}, nil
}

func createSalesOrderTx(input models.SalesOrder, originalID, requesterID, operator, ip string) (*models.SalesOrder, error) {
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
		input.OrderNo = strings.TrimSpace(input.OrderNo)
		input.Barcode = strings.TrimSpace(input.Barcode)
		if input.Barcode == "" && input.OrderNo != "" {
			input.Barcode = input.OrderNo
		}
		if input.Barcode == "" {
			generatedBarcode, err := salesorderidentity.GenerateSalesOrderBarcodeTx(tx, input.Classification)
			if err != nil {
				return err
			}
			input.Barcode = generatedBarcode
		}
		if input.OrderNo == "" {
			input.OrderNo = input.Barcode
		}
		if input.OrderNo == "" && originalID != "" {
			input.OrderNo = strings.TrimSpace(originalID)
		}
		if input.OrderNo == "" {
			return fmt.Errorf("[VALIDATION] sales order orderNo is required")
		}
		if strings.TrimSpace(input.ID) == "" {
			input.ID = uuid.NewString()
		}
		if err := normalizeSalesOrderLineProductFieldsForCustomerTx(tx, input.CustomerID, input.Lines); err != nil {
			return err
		}
		if err := normalizeSalesOrderLinePackagingSelectionsTx(tx, nil, input.Lines); err != nil {
			return err
		}
		recalculateSalesOrderAuthorityCosts(&input)
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		if err := recordAuditEventTx(tx, trading_audit.BuildSalesOrderCreateEvent(input, audit.AuditActor{UserID: requesterID, Username: operator, IP: ip, Source: "http"})); err != nil {
			return err
		}
		if _, err := RecalculateSalesOrderStatusTx(tx, input.ID); err != nil {
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
	delete(raw, "amount")
	delete(raw, "quantity")
	delete(raw, "updatedBy")
	delete(raw, "version")
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
		ID:                   input.ID,
		OrderNo:              input.OrderNo,
		OrderName:            input.OrderName,
		CustomerName:         input.CustomerName,
		CustomerID:           input.CustomerID,
		Type:                 input.Type,
		Currency:             input.Currency,
		ExchangeRateSnapshot: input.ExchangeRateSnapshot,
		PaymentMethod:        input.PaymentMethod,
		PaymentMethodName:    input.PaymentMethodName,
		PaymentTerm:          input.PaymentTerm,
		PaymentTermName:      input.PaymentTermName,
		Classification:       input.Classification,
		Status:               input.Status,
		StatusNote:           input.StatusNote,
		Amount:               input.Amount,
		Quantity:             input.Quantity,
		OrderDate:            input.OrderDate,
		DeliveryDate:         input.DeliveryDate,
		PurchaseOrderNo:      input.PurchaseOrderNo,
		Barcode:              input.Barcode,
		Requirements:         input.Requirements,
		Evidences:            input.Evidences,
		UpdatedBy:            input.UpdatedBy,
		IsDeleted:            input.IsDeleted,
		Version:              input.Version,
		Lines:                input.Lines,
	}
}

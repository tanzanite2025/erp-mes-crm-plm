package statemachine

import (
	"strings"
	"xdfc-server/models"
)

const PurchaseOrderQuantityTolerance = 1e-9

type PurchaseOrderStatus string

const (
	PurchaseOrderStatusDraft    PurchaseOrderStatus = "Draft"
	PurchaseOrderStatusSent     PurchaseOrderStatus = "Sent"
	PurchaseOrderStatusAwaiting PurchaseOrderStatus = "Awaiting"
	PurchaseOrderStatusReceived PurchaseOrderStatus = "Received"
	PurchaseOrderStatusCanceled PurchaseOrderStatus = "Canceled"
)

type PurchaseOrderAction string

const (
	PurchaseOrderActionSave           PurchaseOrderAction = "save"
	PurchaseOrderActionSend           PurchaseOrderAction = "send"
	PurchaseOrderActionConfirmReceipt PurchaseOrderAction = "confirmReceipt"
	PurchaseOrderActionCreateReturn   PurchaseOrderAction = "createReturn"
	PurchaseOrderActionCancel         PurchaseOrderAction = "cancel"
)

const (
	PurchaseOrderDenyUnknownStatus        = "PURCHASE_ORDER_UNKNOWN_STATUS"
	PurchaseOrderDenyStatusUnchanged      = "PURCHASE_ORDER_STATUS_UNCHANGED"
	PurchaseOrderDenyTransitionNotAllowed = "PURCHASE_ORDER_TRANSITION_NOT_ALLOWED"
	PurchaseOrderDenyEditNotAllowed       = "PURCHASE_ORDER_EDIT_NOT_ALLOWED"
	PurchaseOrderDenyReceiptStatus        = "PURCHASE_ORDER_RECEIPT_STATUS_NOT_ALLOWED"
	PurchaseOrderDenyReceiptNothing       = "PURCHASE_ORDER_RECEIPT_NOTHING_AVAILABLE"
	PurchaseOrderDenyReturnStatus         = "PURCHASE_ORDER_RETURN_STATUS_NOT_ALLOWED"
	PurchaseOrderDenyReturnNothing        = "PURCHASE_ORDER_RETURN_NOTHING_AVAILABLE"
	PurchaseOrderDenyCancelNotAllowed     = "PURCHASE_ORDER_CANCEL_NOT_ALLOWED"
)

type PurchaseOrderStatusDefinition struct {
	Status         PurchaseOrderStatus
	Label          string
	Phase          string
	IsTerminal     bool
	DefaultResolve bool
}

type PurchaseOrderActionDefinition struct {
	Code PurchaseOrderAction
	Name string
	Kind string
}

func PurchaseOrderStatusCatalog() []PurchaseOrderStatusDefinition {
	return []PurchaseOrderStatusDefinition{
		{Status: PurchaseOrderStatusDraft, Label: "草稿", Phase: "draft", IsTerminal: false, DefaultResolve: false},
		{Status: PurchaseOrderStatusSent, Label: "已下达", Phase: "active", IsTerminal: false, DefaultResolve: false},
		{Status: PurchaseOrderStatusAwaiting, Label: "待收货", Phase: "pending", IsTerminal: false, DefaultResolve: false},
		{Status: PurchaseOrderStatusReceived, Label: "已收货", Phase: "done", IsTerminal: true, DefaultResolve: true},
		{Status: PurchaseOrderStatusCanceled, Label: "已作废", Phase: "cancelled", IsTerminal: true, DefaultResolve: true},
	}
}

func PurchaseOrderActionCatalog() []PurchaseOrderActionDefinition {
	return []PurchaseOrderActionDefinition{
		{Code: PurchaseOrderActionSave, Name: "保存采购单", Kind: "updated"},
		{Code: PurchaseOrderActionSend, Name: "下达采购单", Kind: "status"},
		{Code: PurchaseOrderActionConfirmReceipt, Name: "确认收货", Kind: "status"},
		{Code: PurchaseOrderActionCreateReturn, Name: "创建预入库退货", Kind: "updated"},
		{Code: PurchaseOrderActionCancel, Name: "作废采购单", Kind: "status"},
	}
}

func NormalizePurchaseOrderStatus(raw string) PurchaseOrderStatus {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "draft":
		return PurchaseOrderStatusDraft
	case "sent", "submitted", "issued":
		return PurchaseOrderStatusSent
	case "awaiting", "partiallyreceived", "partial_received", "partial-received":
		return PurchaseOrderStatusAwaiting
	case "received", "completed", "done":
		return PurchaseOrderStatusReceived
	case "canceled", "cancelled", "void", "voided":
		return PurchaseOrderStatusCanceled
	default:
		return PurchaseOrderStatus(strings.TrimSpace(raw))
	}
}

func IsKnownPurchaseOrderStatus(status PurchaseOrderStatus) bool {
	switch status {
	case PurchaseOrderStatusDraft,
		PurchaseOrderStatusSent,
		PurchaseOrderStatusAwaiting,
		PurchaseOrderStatusReceived,
		PurchaseOrderStatusCanceled:
		return true
	default:
		return false
	}
}

func IsTerminalPurchaseOrderStatus(status PurchaseOrderStatus) bool {
	return status == PurchaseOrderStatusReceived || status == PurchaseOrderStatusCanceled
}

func CanTransitionPurchaseOrderStatus(currentRaw string, targetRaw string) GuardResult {
	current := NormalizePurchaseOrderStatus(currentRaw)
	target := NormalizePurchaseOrderStatus(targetRaw)

	if !IsKnownPurchaseOrderStatus(current) || !IsKnownPurchaseOrderStatus(target) {
		return Deny(PurchaseOrderDenyUnknownStatus, "unknown purchase order status")
	}
	if current == target {
		return Deny(PurchaseOrderDenyStatusUnchanged, "status unchanged")
	}

	switch current {
	case PurchaseOrderStatusDraft:
		if target == PurchaseOrderStatusSent || target == PurchaseOrderStatusCanceled {
			return Allow()
		}
	case PurchaseOrderStatusSent:
		if target == PurchaseOrderStatusAwaiting || target == PurchaseOrderStatusReceived || target == PurchaseOrderStatusCanceled {
			return Allow()
		}
	case PurchaseOrderStatusAwaiting:
		if target == PurchaseOrderStatusReceived || target == PurchaseOrderStatusCanceled {
			return Allow()
		}
	}

	return Deny(PurchaseOrderDenyTransitionNotAllowed, "purchase order status transition is not allowed")
}

func CanEditPurchaseOrder(order models.PurchaseOrder) GuardResult {
	status := NormalizePurchaseOrderStatus(order.Status)
	if !IsKnownPurchaseOrderStatus(status) {
		return Deny(PurchaseOrderDenyUnknownStatus, "unknown purchase order status")
	}
	if status == PurchaseOrderStatusDraft {
		return Allow()
	}
	return Deny(PurchaseOrderDenyEditNotAllowed, "purchase order status does not allow editing")
}

func CanCancelPurchaseOrder(order models.PurchaseOrder) GuardResult {
	status := NormalizePurchaseOrderStatus(order.Status)
	switch status {
	case PurchaseOrderStatusDraft, PurchaseOrderStatusSent, PurchaseOrderStatusAwaiting:
		return Allow()
	case PurchaseOrderStatusCanceled:
		return Deny(PurchaseOrderDenyCancelNotAllowed, "purchase order already canceled")
	case PurchaseOrderStatusReceived:
		return Deny(PurchaseOrderDenyCancelNotAllowed, "received purchase order cannot be canceled")
	default:
		return Deny(PurchaseOrderDenyUnknownStatus, "unknown purchase order status")
	}
}

func CanConfirmPurchaseReceipt(order models.PurchaseOrder) GuardResult {
	status := NormalizePurchaseOrderStatus(order.Status)
	if status != PurchaseOrderStatusSent && status != PurchaseOrderStatusAwaiting {
		if !IsKnownPurchaseOrderStatus(status) {
			return Deny(PurchaseOrderDenyUnknownStatus, "unknown purchase order status")
		}
		return Deny(PurchaseOrderDenyReceiptStatus, "purchase order status does not allow receipt confirmation")
	}
	if !PurchaseOrderHasRemainingQuantity(order) {
		return Deny(PurchaseOrderDenyReceiptNothing, "purchase order has no remaining receivable quantity")
	}
	return Allow()
}

func CanCreatePurchasePreInboundReturn(order models.PurchaseOrder) GuardResult {
	status := NormalizePurchaseOrderStatus(order.Status)
	if status != PurchaseOrderStatusSent && status != PurchaseOrderStatusAwaiting {
		if !IsKnownPurchaseOrderStatus(status) {
			return Deny(PurchaseOrderDenyUnknownStatus, "unknown purchase order status")
		}
		return Deny(PurchaseOrderDenyReturnStatus, "purchase order status does not allow pre-inbound return")
	}
	if !PurchaseOrderHasRemainingQuantity(order) {
		return Deny(PurchaseOrderDenyReturnNothing, "purchase order has no remaining returnable quantity")
	}
	return Allow()
}

func CanPerformPurchaseOrderAction(order models.PurchaseOrder, action PurchaseOrderAction) GuardResult {
	switch action {
	case PurchaseOrderActionSave:
		return CanEditPurchaseOrder(order)
	case PurchaseOrderActionSend:
		return CanTransitionPurchaseOrderStatus(order.Status, string(PurchaseOrderStatusSent))
	case PurchaseOrderActionConfirmReceipt:
		return CanConfirmPurchaseReceipt(order)
	case PurchaseOrderActionCreateReturn:
		return CanCreatePurchasePreInboundReturn(order)
	case PurchaseOrderActionCancel:
		return CanCancelPurchaseOrder(order)
	default:
		return Deny(PurchaseOrderDenyTransitionNotAllowed, "purchase order action is not allowed")
	}
}

func PurchaseOrderHasProgress(order models.PurchaseOrder) bool {
	for _, line := range order.Lines {
		if line.ReceivedQty > PurchaseOrderQuantityTolerance || line.ReturnedQty > PurchaseOrderQuantityTolerance {
			return true
		}
	}
	return false
}

func PurchaseOrderHasRemainingQuantity(order models.PurchaseOrder) bool {
	for _, line := range order.Lines {
		if line.Qty-line.ReceivedQty-line.ReturnedQty > PurchaseOrderQuantityTolerance {
			return true
		}
	}
	return false
}

func DerivePurchaseOrderStatus(order models.PurchaseOrder) GuardResult {
	status := NormalizePurchaseOrderStatus(order.Status)
	if !IsKnownPurchaseOrderStatus(status) {
		return Deny(PurchaseOrderDenyUnknownStatus, "unknown purchase order status")
	}
	if status == PurchaseOrderStatusCanceled {
		return Allow()
	}
	if len(order.Lines) == 0 {
		return Allow()
	}

	target := PurchaseOrderStatusSent
	if status == PurchaseOrderStatusDraft {
		target = PurchaseOrderStatusDraft
	}
	if PurchaseOrderHasProgress(order) {
		target = PurchaseOrderStatusAwaiting
	}
	if !PurchaseOrderHasRemainingQuantity(order) {
		target = PurchaseOrderStatusReceived
	}

	if status == target {
		return Allow()
	}
	return CanTransitionPurchaseOrderStatus(string(status), string(target))
}

func DerivePurchaseOrderStatusValue(order models.PurchaseOrder) (PurchaseOrderStatus, GuardResult) {
	status := NormalizePurchaseOrderStatus(order.Status)
	guard := DerivePurchaseOrderStatus(order)
	if !guard.Allowed {
		return status, guard
	}
	if status == PurchaseOrderStatusCanceled || len(order.Lines) == 0 {
		return status, Allow()
	}
	if !PurchaseOrderHasRemainingQuantity(order) {
		return PurchaseOrderStatusReceived, Allow()
	}
	if PurchaseOrderHasProgress(order) {
		return PurchaseOrderStatusAwaiting, Allow()
	}
	if status == PurchaseOrderStatusDraft {
		return PurchaseOrderStatusDraft, Allow()
	}
	return PurchaseOrderStatusSent, Allow()
}

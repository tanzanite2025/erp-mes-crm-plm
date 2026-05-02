package statemachine

import (
	"strings"
	"xdfc-server/models"
)

const SalesOrderQuantityTolerance = 1e-9

type SalesOrderStatus string

const (
	SalesOrderStatusDraft      SalesOrderStatus = "Draft"
	SalesOrderStatusPending    SalesOrderStatus = "Pending"
	SalesOrderStatusScheduling SalesOrderStatus = "Scheduling"
	SalesOrderStatusInProgress SalesOrderStatus = "InProgress"
	SalesOrderStatusDone       SalesOrderStatus = "Done"
	SalesOrderStatusCanceled   SalesOrderStatus = "Canceled"
)

type SalesOrderAction string

const (
	SalesOrderActionSubmitPending   SalesOrderAction = "submitPending"
	SalesOrderActionStartScheduling SalesOrderAction = "startScheduling"
	SalesOrderActionStartProduction SalesOrderAction = "startProduction"
	SalesOrderActionMarkDone        SalesOrderAction = "markDone"
	SalesOrderActionCancel          SalesOrderAction = "cancel"
	SalesOrderActionCreateReturn    SalesOrderAction = "createReturn"
)

const (
	SalesOrderDenyUnknownStatus        = "SALES_ORDER_UNKNOWN_STATUS"
	SalesOrderDenyStatusUnchanged      = "SALES_ORDER_STATUS_UNCHANGED"
	SalesOrderDenyTransitionNotAllowed = "SALES_ORDER_TRANSITION_NOT_ALLOWED"
	SalesOrderDenyCancelNotAllowed     = "SALES_ORDER_CANCEL_NOT_ALLOWED"
	SalesOrderDenyReturnStatus         = "SALES_ORDER_RETURN_STATUS_NOT_ALLOWED"
	SalesOrderDenyReturnQuantity       = "SALES_ORDER_RETURN_QUANTITY_EXCEEDS_DELIVERED"
	SalesOrderDenyReturnNothing        = "SALES_ORDER_RETURN_NOTHING_AVAILABLE"
)

type SalesOrderStatusDefinition struct {
	Status         SalesOrderStatus
	Label          string
	Phase          string
	IsTerminal     bool
	DefaultResolve bool
}

func SalesOrderStatusCatalog() []SalesOrderStatusDefinition {
	return []SalesOrderStatusDefinition{
		{Status: SalesOrderStatusDraft, Label: "草稿", Phase: "draft", IsTerminal: false, DefaultResolve: false},
		{Status: SalesOrderStatusPending, Label: "待处理", Phase: "pending", IsTerminal: false, DefaultResolve: false},
		{Status: SalesOrderStatusScheduling, Label: "排产中", Phase: "scheduling", IsTerminal: false, DefaultResolve: false},
		{Status: SalesOrderStatusInProgress, Label: "生产中", Phase: "active", IsTerminal: false, DefaultResolve: false},
		{Status: SalesOrderStatusDone, Label: "已完成", Phase: "done", IsTerminal: true, DefaultResolve: true},
		{Status: SalesOrderStatusCanceled, Label: "已作废", Phase: "cancelled", IsTerminal: true, DefaultResolve: true},
	}
}

func NormalizeSalesOrderStatus(raw string) SalesOrderStatus {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "draft":
		return SalesOrderStatusDraft
	case "pending":
		return SalesOrderStatusPending
	case "scheduling", "scheduled", "inplanning", "in_planning":
		return SalesOrderStatusScheduling
	case "inprogress", "in_progress":
		return SalesOrderStatusInProgress
	case "done", "completed":
		return SalesOrderStatusDone
	case "canceled", "cancelled":
		return SalesOrderStatusCanceled
	default:
		return SalesOrderStatus(strings.TrimSpace(raw))
	}
}

func IsKnownSalesOrderStatus(status SalesOrderStatus) bool {
	switch status {
	case SalesOrderStatusDraft,
		SalesOrderStatusPending,
		SalesOrderStatusScheduling,
		SalesOrderStatusInProgress,
		SalesOrderStatusDone,
		SalesOrderStatusCanceled:
		return true
	default:
		return false
	}
}

func CanTransitionSalesOrderStatus(currentRaw string, targetRaw string) GuardResult {
	current := NormalizeSalesOrderStatus(currentRaw)
	target := NormalizeSalesOrderStatus(targetRaw)

	if !IsKnownSalesOrderStatus(current) || !IsKnownSalesOrderStatus(target) {
		return Deny(SalesOrderDenyUnknownStatus, "unknown sales order status")
	}
	if current == target {
		return Deny(SalesOrderDenyStatusUnchanged, "status unchanged")
	}

	switch current {
	case SalesOrderStatusDraft:
		if target == SalesOrderStatusPending || target == SalesOrderStatusCanceled {
			return Allow()
		}
	case SalesOrderStatusPending:
		if target == SalesOrderStatusScheduling || target == SalesOrderStatusCanceled {
			return Allow()
		}
	case SalesOrderStatusScheduling:
		if target == SalesOrderStatusInProgress || target == SalesOrderStatusCanceled {
			return Allow()
		}
	case SalesOrderStatusInProgress:
		if target == SalesOrderStatusDone {
			return Allow()
		}
	}

	return Deny(SalesOrderDenyTransitionNotAllowed, "sales order status transition is not allowed")
}

func CanCancelSalesOrder(order models.SalesOrder) GuardResult {
	status := NormalizeSalesOrderStatus(order.Status)
	switch status {
	case SalesOrderStatusDraft, SalesOrderStatusPending, SalesOrderStatusScheduling:
		return Allow()
	case SalesOrderStatusCanceled:
		return Deny(SalesOrderDenyCancelNotAllowed, "order already canceled")
	default:
		return Deny(SalesOrderDenyCancelNotAllowed, "sales order status does not allow cancel")
	}
}

func CanPerformSalesOrderAction(order models.SalesOrder, action SalesOrderAction, returnedQuantityByLineID map[uint]float64) GuardResult {
	switch action {
	case SalesOrderActionSubmitPending:
		return CanTransitionSalesOrderStatus(order.Status, string(SalesOrderStatusPending))
	case SalesOrderActionStartScheduling:
		return CanTransitionSalesOrderStatus(order.Status, string(SalesOrderStatusScheduling))
	case SalesOrderActionStartProduction:
		return CanTransitionSalesOrderStatus(order.Status, string(SalesOrderStatusInProgress))
	case SalesOrderActionMarkDone:
		return CanTransitionSalesOrderStatus(order.Status, string(SalesOrderStatusDone))
	case SalesOrderActionCancel:
		return CanCancelSalesOrder(order)
	case SalesOrderActionCreateReturn:
		return CanCreateSalesReturn(order, returnedQuantityByLineID, nil)
	default:
		return Deny(SalesOrderDenyTransitionNotAllowed, "sales order action is not allowed")
	}
}

func CanCreateSalesReturn(order models.SalesOrder, returnedQuantityByLineID map[uint]float64, requestedQuantityByLineID map[uint]float64) GuardResult {
	status := NormalizeSalesOrderStatus(order.Status)
	if status != SalesOrderStatusInProgress && status != SalesOrderStatusDone {
		return Deny(SalesOrderDenyReturnStatus, "sales order status does not allow return")
	}

	if len(requestedQuantityByLineID) == 0 {
		for _, line := range order.Lines {
			if line.DeliveredQty-returnedQuantityByLineID[line.ID] > SalesOrderQuantityTolerance {
				return Allow()
			}
		}
		return Deny(SalesOrderDenyReturnNothing, "sales order has no remaining returnable quantity")
	}

	lineByID := make(map[uint]models.SalesOrderLine, len(order.Lines))
	for _, line := range order.Lines {
		lineByID[line.ID] = line
	}

	for lineID, requestedQuantity := range requestedQuantityByLineID {
		line, ok := lineByID[lineID]
		if !ok {
			continue
		}
		remaining := line.DeliveredQty - returnedQuantityByLineID[lineID]
		if requestedQuantity > remaining+SalesOrderQuantityTolerance {
			return Deny(SalesOrderDenyReturnQuantity, "return quantity exceeds remaining returnable quantity")
		}
	}

	return Allow()
}

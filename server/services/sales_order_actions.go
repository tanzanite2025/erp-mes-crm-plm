package services

import (
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"
)

var salesOrderAvailableActionOrder = []statemachine.SalesOrderAction{
	statemachine.SalesOrderActionSubmitPending,
	statemachine.SalesOrderActionStartScheduling,
	statemachine.SalesOrderActionStartProduction,
	statemachine.SalesOrderActionMarkDone,
	statemachine.SalesOrderActionCancel,
	statemachine.SalesOrderActionCreateReturn,
}

func buildSalesOrderAvailableActions(order models.SalesOrder, returnedQuantityMap map[uint]float64) []SalesOrderActionAvailabilityResponse {
	actions := make([]SalesOrderActionAvailabilityResponse, 0, len(salesOrderAvailableActionOrder))
	for _, action := range salesOrderAvailableActionOrder {
		result := statemachine.CanPerformSalesOrderAction(order, action, returnedQuantityMap)
		actions = append(actions, SalesOrderActionAvailabilityResponse{
			Action:     string(action),
			Allowed:    result.Allowed,
			ReasonCode: result.ReasonCode,
			Reason:     result.Reason,
		})
	}
	return actions
}

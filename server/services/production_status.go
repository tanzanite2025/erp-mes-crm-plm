package services

import (
	"errors"
	"fmt"
	"xdfc-server/models"
)

var (
	ErrInvalidProductionPlanStatus  = errors.New("invalid production plan status")
	ErrInvalidProductionTaskStatus  = errors.New("invalid production task status")
	ErrCuttingIssuanceAlreadyExists = errors.New("[CONFLICT] 该订单行已执行过领料下发，不可重复操作")
)

var productionPlanStatusSet = map[string]struct{}{
	"SCHEDULED":   {},
	"IN_PROGRESS": {},
	"COMPLETED":   {},
	"CANCELED":    {},
}

var productionTaskStatusSet = map[string]struct{}{
	"PENDING": {},
	"RUNNING": {},
	"HOLD":    {},
	"DONE":    {},
}

func IsProductionPlanStatus(status string) bool {
	_, ok := productionPlanStatusSet[status]
	return ok
}

func IsProductionTaskStatus(status string) bool {
	_, ok := productionTaskStatusSet[status]
	return ok
}

func ValidateProductionPlanStatuses(plan models.ProductionPlan) error {
	if !IsProductionPlanStatus(plan.Status) {
		return fmt.Errorf("%w: %s", ErrInvalidProductionPlanStatus, plan.Status)
	}

	for index, task := range plan.Tasks {
		if !IsProductionTaskStatus(task.Status) {
			return fmt.Errorf("%w at tasks[%d]: %s", ErrInvalidProductionTaskStatus, index, task.Status)
		}
	}

	return nil
}

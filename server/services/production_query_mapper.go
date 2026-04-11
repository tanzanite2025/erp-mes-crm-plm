package services

import "xdfc-server/models"

func mapProductionTaskToResponse(task models.ProductionTask) ProductionTaskResponse {
	return ProductionTaskResponse{
		ID:          task.ID,
		PlanID:      task.PlanID,
		BatchNo:     task.BatchNo,
		ProcessID:   task.ProcessID,
		ProcessName: task.ProcessName,
		TargetQty:   task.TargetQty,
		ActualQty:   task.ActualQty,
		Status:      task.Status,
		Operator:    task.Operator,
		StartedAt:   task.StartedAt,
		CompletedAt: task.CompletedAt,
	}
}

func mapProductionPlanToResponse(plan models.ProductionPlan) ProductionPlanResponse {
	tasks := make([]ProductionTaskResponse, 0, len(plan.Tasks))
	for _, task := range plan.Tasks {
		tasks = append(tasks, mapProductionTaskToResponse(task))
	}
	return ProductionPlanResponse{
		ID:          plan.ID,
		CreatedAt:   plan.CreatedAt,
		UpdatedAt:   plan.UpdatedAt,
		OrderNo:     plan.OrderNo,
		OrderID:     plan.OrderID,
		ProductID:   plan.ProductID,
		ProductName: plan.ProductName,
		Quantity:    plan.Quantity,
		Status:      plan.Status,
		StartDate:   plan.StartDate,
		EndDate:     plan.EndDate,
		Notes:       plan.Notes,
		Tasks:       tasks,
	}
}

func MapProductionPlansToResponse(plans []models.ProductionPlan) []ProductionPlanResponse {
	items := make([]ProductionPlanResponse, 0, len(plans))
	for _, plan := range plans {
		items = append(items, mapProductionPlanToResponse(plan))
	}
	return items
}

func MapProductionStatsToResponse(stats models.ProductionStats) ProductionStatsResponse {
	return ProductionStatsResponse{
		TotalPlans:     stats.TotalPlans,
		TotalQuantity:  stats.TotalQuantity,
		ActiveWIP:      stats.ActiveWIP,
		CompletedToday: stats.CompletedToday,
		DelayedCount:   stats.DelayedCount,
	}
}

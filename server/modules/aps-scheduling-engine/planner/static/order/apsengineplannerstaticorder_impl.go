package apsschedulingengine

import (
	"context"
	"errors"
	"time"
)

func (p *OrderPlanner) buildByOrders(_ context.Context, input BuildPlanInput, rules *RuleSet) (*SchedulePlan, error) {
	if len(input.Orders) == 0 {
		return nil, errors.New("no orders to plan")
	}
	if len(input.Resources) == 0 {
		return nil, errors.New("no resources available")
	}
	if rules == nil {
		rules = DefaultRuleSet()
	}

	order := input.Orders[0]
	resource := input.Resources[0]
	windows := p.Windower.Find(order, resource, input.Calendar, rules)
	bestScore := -1.0
	bestWindow := windows[0]
	for _, window := range windows {
		score := p.Scorer.Score(order, resource, window, rules)
		if score.Score > bestScore {
			bestScore = score.Score
			bestWindow = window
		}
	}

	plan := &SchedulePlan{
		ID:         "plan-preview-order",
		Version:    1,
		OrderID:    order.ID,
		ResourceID: resource.ID,
		StartAt:    bestWindow.StartAt,
		EndAt:      bestWindow.EndAt,
		Status:     "draft",
	}

	_ = p.Store.Save(ScheduleVersion{ID: "v1", Version: 1, TriggerType: "initial", CreatedAt: time.Now()})
	return plan, nil
}

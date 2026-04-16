package apsschedulingengine

import (
	"context"
	"errors"
	"time"
)

type ResourcePlanner struct{}

func NewResourcePlanner() *ResourcePlanner {
	return &ResourcePlanner{}
}

func (p *ResourcePlanner) Build(_ context.Context, input BuildPlanInput, rules *RuleSet) (*SchedulePlan, error) {
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
	startAt := time.Now()
	endAt := startAt.Add(2 * time.Hour)

	return &SchedulePlan{
		ID:         "plan-preview-resource",
		Version:    1,
		OrderID:    order.ID,
		ResourceID: resource.ID,
		StartAt:    startAt,
		EndAt:      endAt,
		Status:     "draft",
	}, nil
}

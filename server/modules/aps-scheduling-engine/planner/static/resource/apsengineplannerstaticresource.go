package resource

import (
	"context"
	"errors"
	"time"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type ResourcePlanner struct{}

func NewResourcePlanner() *ResourcePlanner {
	return &ResourcePlanner{}
}

func (p *ResourcePlanner) Build(_ context.Context, input apsschedule.BuildPlanInput, rules *apsrules.RuleSet) (*apsschedule.SchedulePlan, error) {
	if len(input.Orders) == 0 {
		return nil, errors.New("no orders to plan")
	}
	if len(input.Resources) == 0 {
		return nil, errors.New("no resources available")
	}
	if rules == nil {
		rules = apsrules.DefaultRuleSet()
	}

	order := input.Orders[0]
	resource := input.Resources[0]
	startAt := time.Now()
	endAt := startAt.Add(2 * time.Hour)

	return &apsschedule.SchedulePlan{
		ID:         "plan-preview-resource",
		Version:    1,
		OrderID:    order.ID,
		ResourceID: resource.ID,
		StartAt:    startAt,
		EndAt:      endAt,
		Status:     "draft",
	}, nil
}

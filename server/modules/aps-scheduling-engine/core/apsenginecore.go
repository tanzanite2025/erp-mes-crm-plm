package core

import (
	"context"
	apsengine "xdfc-server/modules/aps-scheduling-engine/engine"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type Engine struct {
	Planner *apsengine.Planner
	Rules   *apsrules.RuleSet
}

func NewEngine() *Engine {
	return &Engine{
		Planner: apsengine.NewPlanner(),
		Rules:   apsrules.DefaultRuleSet(),
	}
}

func (e *Engine) BuildPlan(ctx context.Context, input apsschedule.BuildPlanInput) (*apsschedule.SchedulePlan, error) {
	if e.Planner == nil {
		e.Planner = apsengine.NewPlanner()
	}
	if e.Rules == nil {
		e.Rules = apsrules.DefaultRuleSet()
	}
	return e.Planner.Build(ctx, input, e.Rules)
}

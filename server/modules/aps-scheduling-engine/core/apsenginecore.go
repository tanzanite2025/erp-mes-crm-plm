package apsschedulingengine

import "context"

type Engine struct {
	Planner *Planner
	Rules   *RuleSet
}

func NewEngine() *Engine {
	return &Engine{
		Planner: NewPlanner(),
		Rules:   DefaultRuleSet(),
	}
}

func (e *Engine) BuildPlan(ctx context.Context, input BuildPlanInput) (*SchedulePlan, error) {
	if e.Planner == nil {
		e.Planner = NewPlanner()
	}
	if e.Rules == nil {
		e.Rules = DefaultRuleSet()
	}
	return e.Planner.Build(ctx, input, e.Rules)
}

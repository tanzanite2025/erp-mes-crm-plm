package apsschedulingengine

import (
	"context"
	apscore "xdfc-server/modules/aps-scheduling-engine/core"
	apsengine "xdfc-server/modules/aps-scheduling-engine/engine"
	apscalendar "xdfc-server/modules/aps-scheduling-engine/models/calendar"
	apsorder "xdfc-server/modules/aps-scheduling-engine/models/order"
	apsresource "xdfc-server/modules/aps-scheduling-engine/models/resource"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type CalendarDay = apscalendar.CalendarDay

type Order = apsorder.Order

type Resource = apsresource.Resource

type SchedulePlan = apsschedule.SchedulePlan

type ScheduleEvent = apsschedule.ScheduleEvent

type BuildPlanInput = apsschedule.BuildPlanInput

type RuleSet = apsrules.RuleSet

type TimeWindowCandidate = apsschedule.TimeWindowCandidate

type Planner struct {
	inner *apsengine.Planner
}

type Engine struct {
	Planner *Planner
	Rules   *RuleSet
}

func NewEngine() *Engine {
	return &Engine{Planner: NewPlanner(), Rules: DefaultRuleSet()}
}

func NewPlanner() *Planner {
	return &Planner{inner: apsengine.NewPlanner()}
}

func DefaultRuleSet() *RuleSet {
	return apsrules.DefaultRuleSet()
}

func (e *Engine) BuildPlan(ctx context.Context, input BuildPlanInput) (*SchedulePlan, error) {
	if e == nil {
		e = NewEngine()
	}
	if e.Planner == nil {
		e.Planner = NewPlanner()
	}
	if e.Rules == nil {
		e.Rules = DefaultRuleSet()
	}
	coreEngine := &apscore.Engine{Planner: e.Planner.enginePlanner(), Rules: e.Rules}
	return coreEngine.BuildPlan(ctx, input)
}

func (p *Planner) enginePlanner() *apsengine.Planner {
	if p == nil {
		return apsengine.NewPlanner()
	}
	if p.inner == nil {
		p.inner = apsengine.NewPlanner()
	}
	return p.inner
}

func (p *Planner) Build(ctx context.Context, input BuildPlanInput, rules *RuleSet) (*SchedulePlan, error) {
	return p.enginePlanner().Build(ctx, input, rules)
}

func (p *Planner) Recalculate(ctx context.Context, _ ScheduleEvent, input BuildPlanInput, current *SchedulePlan, rules *RuleSet) (*SchedulePlan, error) {
	next, err := p.Build(ctx, input, rules)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return next, nil
	}

	recalculated := *next
	if current.Version <= 0 {
		recalculated.Version = 1
	} else {
		recalculated.Version = current.Version + 1
	}
	if recalculated.Status == "" {
		recalculated.Status = "scheduled"
	}
	return &recalculated, nil
}

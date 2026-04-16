package apsschedulingengine

import "context"

type Planner struct {
	StaticPlanner  *StaticPlanner
	LocalPlanner   *LocalPlanner
	GlobalPlanner  *GlobalPlanner
	Router         *EventRouter
	Analyzer       *ImpactAnalyzer
	Decider        *ReplanDecider
}

func NewPlanner() *Planner {
	staticPlanner := NewStaticPlanner(nil, nil, nil, nil)
	return &Planner{
		StaticPlanner: staticPlanner,
		LocalPlanner:  NewLocalPlanner(staticPlanner),
		GlobalPlanner: NewGlobalPlanner(staticPlanner),
		Router:        NewEventRouter(),
		Analyzer:      NewImpactAnalyzer(),
		Decider:       NewReplanDecider(),
	}
}

func (p *Planner) Build(ctx context.Context, input BuildPlanInput, rules *RuleSet) (*SchedulePlan, error) {
	if p.StaticPlanner == nil {
		p.StaticPlanner = NewStaticPlanner(nil, nil, nil, nil)
	}
	return p.StaticPlanner.Build(ctx, input, rules)
}

func (p *Planner) Recalculate(ctx context.Context, event ScheduleEvent, input BuildPlanInput, current *SchedulePlan) (*SchedulePlan, error) {
	if p.Router == nil {
		p.Router = NewEventRouter()
	}
	if p.Analyzer == nil {
		p.Analyzer = NewImpactAnalyzer()
	}
	if p.Decider == nil {
		p.Decider = NewReplanDecider()
	}
	if p.LocalPlanner == nil {
		p.LocalPlanner = NewLocalPlanner(NewStaticPlanner(nil, nil, nil, nil))
	}
	if p.GlobalPlanner == nil {
		p.GlobalPlanner = NewGlobalPlanner(NewStaticPlanner(nil, nil, nil, nil))
	}

	scope := p.Analyzer.Analyze(event, current)
	mode := p.Decider.Decide(scope)

	switch mode {
	case ReplanModeLocal:
		return p.LocalPlanner.Recalculate(ctx, input, current)
	case ReplanModeGlobal:
		return p.GlobalPlanner.Recalculate(ctx, input, current)
	default:
		return current, nil
	}
}

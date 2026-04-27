package engine

import (
	"context"
	apsevents "xdfc-server/modules/aps-scheduling-engine/events"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsglobal "xdfc-server/modules/aps-scheduling-engine/planner/dynamic/global"
	apslocal "xdfc-server/modules/aps-scheduling-engine/planner/dynamic/local"
	apsstatic "xdfc-server/modules/aps-scheduling-engine/planner/static"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type Planner struct {
	StaticPlanner *apsstatic.StaticPlanner
	LocalPlanner  *apslocal.LocalPlanner
	GlobalPlanner *apsglobal.GlobalPlanner
	Router        *apsevents.EventRouter
	Analyzer      *apsevents.ImpactAnalyzer
	Decider       *apsevents.ReplanDecider
}

func NewPlanner() *Planner {
	staticPlanner := apsstatic.NewStaticPlanner(nil, nil, nil, nil)
	return &Planner{
		StaticPlanner: staticPlanner,
		LocalPlanner:  apslocal.NewLocalPlanner(staticPlanner),
		GlobalPlanner: apsglobal.NewGlobalPlanner(staticPlanner),
		Router:        apsevents.NewEventRouter(),
		Analyzer:      apsevents.NewImpactAnalyzer(),
		Decider:       apsevents.NewReplanDecider(),
	}
}

func (p *Planner) Build(ctx context.Context, input apsschedule.BuildPlanInput, rules *apsrules.RuleSet) (*apsschedule.SchedulePlan, error) {
	if p.StaticPlanner == nil {
		p.StaticPlanner = apsstatic.NewStaticPlanner(nil, nil, nil, nil)
	}
	return p.StaticPlanner.Build(ctx, input, rules)
}

func (p *Planner) Recalculate(ctx context.Context, event apsschedule.ScheduleEvent, input apsschedule.BuildPlanInput, current *apsschedule.SchedulePlan) (*apsschedule.SchedulePlan, error) {
	if p.Router == nil {
		p.Router = apsevents.NewEventRouter()
	}
	if p.Analyzer == nil {
		p.Analyzer = apsevents.NewImpactAnalyzer()
	}
	if p.Decider == nil {
		p.Decider = apsevents.NewReplanDecider()
	}
	if p.LocalPlanner == nil {
		p.LocalPlanner = apslocal.NewLocalPlanner(apsstatic.NewStaticPlanner(nil, nil, nil, nil))
	}
	if p.GlobalPlanner == nil {
		p.GlobalPlanner = apsglobal.NewGlobalPlanner(apsstatic.NewStaticPlanner(nil, nil, nil, nil))
	}

	scope := p.Analyzer.Analyze(event, current)
	mode := p.Decider.Decide(scope)

	switch mode {
	case apsevents.ReplanModeLocal:
		return p.LocalPlanner.Recalculate(ctx, input, current)
	case apsevents.ReplanModeGlobal:
		return p.GlobalPlanner.Recalculate(ctx, input, current)
	default:
		return current, nil
	}
}

package apsschedulingengine

import "context"

type GlobalPlanner struct {
	Static *StaticPlanner
}

func NewGlobalPlanner(static *StaticPlanner) *GlobalPlanner {
	return &GlobalPlanner{Static: static}
}

func (p *GlobalPlanner) Recalculate(ctx context.Context, input BuildPlanInput, current *SchedulePlan) (*SchedulePlan, error) {
	if p.Static == nil {
		p.Static = NewStaticPlanner(nil, nil, nil, nil)
	}
	if current == nil {
		return p.Static.Build(ctx, input, nil)
	}

	updated := *current
	updated.Version++
	updated.Status = "global-recalculated"

	for _, event := range input.Events {
		switch event.Type {
		case "machine", "holiday":
			updated.Status = "global-capacity-recalculated"
		case "overtime":
			updated.Status = "global-overtime-recalculated"
		default:
			updated.Status = "global-replanned"
		}
	}

	return &updated, nil
}

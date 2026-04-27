package global

import (
	"context"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsstatic "xdfc-server/modules/aps-scheduling-engine/planner/static"
)

type GlobalPlanner struct {
	Static *apsstatic.StaticPlanner
}

func NewGlobalPlanner(static *apsstatic.StaticPlanner) *GlobalPlanner {
	return &GlobalPlanner{Static: static}
}

func (p *GlobalPlanner) Recalculate(ctx context.Context, input apsschedule.BuildPlanInput, current *apsschedule.SchedulePlan) (*apsschedule.SchedulePlan, error) {
	if p.Static == nil {
		p.Static = apsstatic.NewStaticPlanner(nil, nil, nil, nil)
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

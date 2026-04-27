package local

import (
	"context"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsstatic "xdfc-server/modules/aps-scheduling-engine/planner/static"
)

type LocalPlanner struct {
	Static *apsstatic.StaticPlanner
}

func NewLocalPlanner(static *apsstatic.StaticPlanner) *LocalPlanner {
	return &LocalPlanner{Static: static}
}

func (p *LocalPlanner) Recalculate(ctx context.Context, input apsschedule.BuildPlanInput, current *apsschedule.SchedulePlan) (*apsschedule.SchedulePlan, error) {
	if p.Static == nil {
		p.Static = apsstatic.NewStaticPlanner(nil, nil, nil, nil)
	}
	if current == nil {
		return p.Static.Build(ctx, input, nil)
	}

	updated := *current
	updated.Version++
	updated.Status = "local-recalculated"

	for _, event := range input.Events {
		switch event.Type {
		case "barcode", "attendance":
			updated.Status = "local-capacity-adjusted"
		case "material":
			updated.Status = "local-material-adjusted"
		}
	}

	return &updated, nil
}

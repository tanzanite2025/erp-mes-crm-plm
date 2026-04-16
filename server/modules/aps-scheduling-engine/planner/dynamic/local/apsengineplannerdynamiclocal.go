package apsschedulingengine

import "context"

type LocalPlanner struct {
	Static *StaticPlanner
}

func NewLocalPlanner(static *StaticPlanner) *LocalPlanner {
	return &LocalPlanner{Static: static}
}

func (p *LocalPlanner) Recalculate(ctx context.Context, input BuildPlanInput, current *SchedulePlan) (*SchedulePlan, error) {
	if p.Static == nil {
		p.Static = NewStaticPlanner(nil, nil, nil, nil)
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

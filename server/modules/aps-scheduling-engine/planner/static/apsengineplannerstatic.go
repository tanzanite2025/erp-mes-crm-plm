package static

import (
	"context"
	apsmatching "xdfc-server/modules/aps-scheduling-engine/matching"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsorderplanner "xdfc-server/modules/aps-scheduling-engine/planner/static/order"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
	apsscoring "xdfc-server/modules/aps-scheduling-engine/scoring"
	apsversioning "xdfc-server/modules/aps-scheduling-engine/versioning"
	apswindowing "xdfc-server/modules/aps-scheduling-engine/windowing"
)

type StaticPlanner struct {
	Scorer   *apsscoring.CandidateScorer
	Matcher  *apsmatching.ResourceMatcher
	Windower *apswindowing.TimeWindowFinder
	Store    *apsversioning.VersionStore
}

func NewStaticPlanner(scorer *apsscoring.CandidateScorer, matcher *apsmatching.ResourceMatcher, windower *apswindowing.TimeWindowFinder, store *apsversioning.VersionStore) *StaticPlanner {
	return &StaticPlanner{Scorer: scorer, Matcher: matcher, Windower: windower, Store: store}
}

func (p *StaticPlanner) Build(ctx context.Context, input apsschedule.BuildPlanInput, rules *apsrules.RuleSet) (*apsschedule.SchedulePlan, error) {
	if p.Scorer == nil {
		p.Scorer = apsscoring.NewCandidateScorer()
	}
	if p.Matcher == nil {
		p.Matcher = apsmatching.NewResourceMatcher()
	}
	if p.Windower == nil {
		p.Windower = apswindowing.NewTimeWindowFinder()
	}
	if p.Store == nil {
		p.Store = apsversioning.NewVersionStore()
	}

	return apsorderplanner.NewOrderPlanner(p.Scorer, p.Matcher, p.Windower, p.Store).Build(ctx, input, rules)
}

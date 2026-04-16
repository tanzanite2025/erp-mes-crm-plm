package apsschedulingengine

import "context"

type StaticPlanner struct {
	Scorer   *CandidateScorer
	Matcher  *ResourceMatcher
	Windower *TimeWindowFinder
	Store    *VersionStore
}

func NewStaticPlanner(scorer *CandidateScorer, matcher *ResourceMatcher, windower *TimeWindowFinder, store *VersionStore) *StaticPlanner {
	return &StaticPlanner{Scorer: scorer, Matcher: matcher, Windower: windower, Store: store}
}

func (p *StaticPlanner) Build(ctx context.Context, input BuildPlanInput, rules *RuleSet) (*SchedulePlan, error) {
	if p.Scorer == nil {
		p.Scorer = NewCandidateScorer()
	}
	if p.Matcher == nil {
		p.Matcher = NewResourceMatcher()
	}
	if p.Windower == nil {
		p.Windower = NewTimeWindowFinder()
	}
	if p.Store == nil {
		p.Store = NewVersionStore()
	}

	return NewOrderPlanner(p.Scorer, p.Matcher, p.Windower, p.Store).Build(ctx, input, rules)
}

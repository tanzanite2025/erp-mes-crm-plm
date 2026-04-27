package static

import (
	apsmatching "xdfc-server/modules/aps-scheduling-engine/matching"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsorder "xdfc-server/modules/aps-scheduling-engine/planner/static/order"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
	apsscoring "xdfc-server/modules/aps-scheduling-engine/scoring"
	apsversioning "xdfc-server/modules/aps-scheduling-engine/versioning"
	apswindowing "xdfc-server/modules/aps-scheduling-engine/windowing"
)

type CandidateScorer = apsscoring.CandidateScorer

type ResourceMatcher = apsmatching.ResourceMatcher

type TimeWindowFinder = apswindowing.TimeWindowFinder

type VersionStore = apsversioning.VersionStore

type BuildPlanInput = apsschedule.BuildPlanInput

type RuleSet = apsrules.RuleSet

type SchedulePlan = apsschedule.SchedulePlan

func NewCandidateScorer() *CandidateScorer {
	return apsscoring.NewCandidateScorer()
}

func NewResourceMatcher() *ResourceMatcher {
	return apsmatching.NewResourceMatcher()
}

func NewTimeWindowFinder() *TimeWindowFinder {
	return apswindowing.NewTimeWindowFinder()
}

func NewVersionStore() *VersionStore {
	return apsversioning.NewVersionStore()
}

func NewOrderPlanner(scorer *CandidateScorer, matcher *ResourceMatcher, windower *TimeWindowFinder, store *VersionStore) *apsorder.OrderPlanner {
	return apsorder.NewOrderPlanner(scorer, matcher, windower, store)
}

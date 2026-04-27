package order

import (
	apsmatching "xdfc-server/modules/aps-scheduling-engine/matching"
	apsorder "xdfc-server/modules/aps-scheduling-engine/models/order"
	apsresource "xdfc-server/modules/aps-scheduling-engine/models/resource"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
	apsscoring "xdfc-server/modules/aps-scheduling-engine/scoring"
	apsversioning "xdfc-server/modules/aps-scheduling-engine/versioning"
	apswindowing "xdfc-server/modules/aps-scheduling-engine/windowing"
)

type CandidateScorer = apsscoring.CandidateScorer

type ResourceMatcher = apsmatching.ResourceMatcher

type TimeWindowFinder = apswindowing.TimeWindowFinder

type VersionStore = apsversioning.VersionStore

type ScheduleVersion = apsschedule.ScheduleVersion

type CandidateScore = apsscoring.CandidateScore

type Order = apsorder.Order

type Resource = apsresource.Resource

type TimeWindowCandidate = apsschedule.TimeWindowCandidate

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

func DefaultRuleSet() *RuleSet {
	return apsrules.DefaultRuleSet()
}

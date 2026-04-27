package global

import (
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsstatic "xdfc-server/modules/aps-scheduling-engine/planner/static"
)

type StaticPlanner = apsstatic.StaticPlanner

type BuildPlanInput = apsschedule.BuildPlanInput

type SchedulePlan = apsschedule.SchedulePlan

func NewStaticPlanner(scorer *apsstatic.CandidateScorer, matcher *apsstatic.ResourceMatcher, windower *apsstatic.TimeWindowFinder, store *apsstatic.VersionStore) *StaticPlanner {
	return apsstatic.NewStaticPlanner(scorer, matcher, windower, store)
}

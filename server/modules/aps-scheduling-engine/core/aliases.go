package core

import (
	apsengine "xdfc-server/modules/aps-scheduling-engine/engine"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type Planner = apsengine.Planner

type RuleSet = apsrules.RuleSet

type BuildPlanInput = apsschedule.BuildPlanInput

type SchedulePlan = apsschedule.SchedulePlan

func NewPlanner() *Planner {
	return apsengine.NewPlanner()
}

func DefaultRuleSet() *RuleSet {
	return apsrules.DefaultRuleSet()
}

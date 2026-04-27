package resource

import (
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type BuildPlanInput = apsschedule.BuildPlanInput

type RuleSet = apsrules.RuleSet

type SchedulePlan = apsschedule.SchedulePlan

func DefaultRuleSet() *RuleSet {
	return apsrules.DefaultRuleSet()
}

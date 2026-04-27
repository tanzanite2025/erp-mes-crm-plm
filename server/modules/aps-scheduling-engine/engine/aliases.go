package engine

import (
	apsevents "xdfc-server/modules/aps-scheduling-engine/events"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsglobal "xdfc-server/modules/aps-scheduling-engine/planner/dynamic/global"
	apslocal "xdfc-server/modules/aps-scheduling-engine/planner/dynamic/local"
	apsstatic "xdfc-server/modules/aps-scheduling-engine/planner/static"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type StaticPlanner = apsstatic.StaticPlanner

type LocalPlanner = apslocal.LocalPlanner

type GlobalPlanner = apsglobal.GlobalPlanner

type EventRouter = apsevents.EventRouter

type ImpactAnalyzer = apsevents.ImpactAnalyzer

type ReplanDecider = apsevents.ReplanDecider

type BuildPlanInput = apsschedule.BuildPlanInput

type RuleSet = apsrules.RuleSet

type SchedulePlan = apsschedule.SchedulePlan

type ScheduleEvent = apsschedule.ScheduleEvent

type ReplanMode = apsevents.ReplanMode

const (
	ReplanModeIgnore ReplanMode = apsevents.ReplanModeIgnore
	ReplanModeLocal  ReplanMode = apsevents.ReplanModeLocal
	ReplanModeGlobal ReplanMode = apsevents.ReplanModeGlobal
)

func NewStaticPlanner(scorer *apsstatic.CandidateScorer, matcher *apsstatic.ResourceMatcher, windower *apsstatic.TimeWindowFinder, store *apsstatic.VersionStore) *StaticPlanner {
	return apsstatic.NewStaticPlanner(scorer, matcher, windower, store)
}

func NewLocalPlanner(static *StaticPlanner) *LocalPlanner {
	return apslocal.NewLocalPlanner(static)
}

func NewGlobalPlanner(static *StaticPlanner) *GlobalPlanner {
	return apsglobal.NewGlobalPlanner(static)
}

func NewEventRouter() *EventRouter {
	return apsevents.NewEventRouter()
}

func NewImpactAnalyzer() *ImpactAnalyzer {
	return apsevents.NewImpactAnalyzer()
}

func NewReplanDecider() *ReplanDecider {
	return apsevents.NewReplanDecider()
}

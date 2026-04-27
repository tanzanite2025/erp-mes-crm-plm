package order

import (
	"context"
	"errors"
	"sort"
	apsmatching "xdfc-server/modules/aps-scheduling-engine/matching"
	apsorder "xdfc-server/modules/aps-scheduling-engine/models/order"
	apsresource "xdfc-server/modules/aps-scheduling-engine/models/resource"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
	apsscoring "xdfc-server/modules/aps-scheduling-engine/scoring"
	apsversioning "xdfc-server/modules/aps-scheduling-engine/versioning"
	apswindowing "xdfc-server/modules/aps-scheduling-engine/windowing"
)

type OrderPlanner struct {
	Scorer   *apsscoring.CandidateScorer
	Matcher  *apsmatching.ResourceMatcher
	Windower *apswindowing.TimeWindowFinder
	Store    *apsversioning.VersionStore
}

func NewOrderPlanner(scorer *apsscoring.CandidateScorer, matcher *apsmatching.ResourceMatcher, windower *apswindowing.TimeWindowFinder, store *apsversioning.VersionStore) *OrderPlanner {
	return &OrderPlanner{Scorer: scorer, Matcher: matcher, Windower: windower, Store: store}
}

func (p *OrderPlanner) Build(_ context.Context, input apsschedule.BuildPlanInput, rules *apsrules.RuleSet) (*apsschedule.SchedulePlan, error) {
	if len(input.Orders) == 0 {
		return nil, errors.New("no orders to plan")
	}
	if len(input.Resources) == 0 {
		return nil, errors.New("no resources available")
	}
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
	if rules == nil {
		rules = apsrules.DefaultRuleSet()
	}

	tasks := append([]apsorder.Order(nil), input.Orders...)
	sort.SliceStable(tasks, func(i, j int) bool { return tasks[i].Priority > tasks[j].Priority })

	bestPlan := &apsschedule.SchedulePlan{ID: "plan-preview", Version: 1, Status: "draft"}
	var lastAssigned apsorder.Order
	plannedAny := false

	for _, task := range tasks {
		matchedResources := p.Matcher.Match(task, input.Resources, input.Calendar, rules)
		var bestScore apsscoring.CandidateScore
		bestScore.Score = -1e9
		var selectedResource apsresource.Resource
		var selectedWindow apsschedule.TimeWindowCandidate
		found := false

		for _, resource := range matchedResources {
			windows := p.Windower.Find(task, resource, input.Calendar, rules)
			for _, window := range windows {
				if rules.StopDayHardBlock && window.StopDayFlag {
					continue
				}
				if rules.HolidayStopsPlan && window.HolidayFlag {
					continue
				}
				if window.OvertimeFlag && !rules.AllowOvertime {
					continue
				}

				score := p.Scorer.Score(task, resource, window, rules)
				if score.Score > bestScore.Score {
					bestScore = score
					selectedResource = resource
					selectedWindow = window
					found = true
				}
			}
		}

		if !found {
			continue
		}

		plannedAny = true
		lastAssigned = task
		bestPlan.ID = lastAssigned.ID
		bestPlan.OrderID = lastAssigned.ID
		bestPlan.ResourceID = selectedResource.ID
		bestPlan.StartAt = selectedWindow.StartAt
		bestPlan.EndAt = selectedWindow.EndAt
		bestPlan.Status = "scheduled"
	}

	if !plannedAny {
		return nil, errors.New("no schedulable calendar window")
	}

	return bestPlan, nil
}

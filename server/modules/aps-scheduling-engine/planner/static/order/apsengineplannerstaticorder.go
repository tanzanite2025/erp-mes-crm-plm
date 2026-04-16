package apsschedulingengine

import (
	"context"
	"errors"
	"sort"
)

type OrderPlanner struct {
	Scorer   *CandidateScorer
	Matcher  *ResourceMatcher
	Windower *TimeWindowFinder
	Store    *VersionStore
}

func NewOrderPlanner(scorer *CandidateScorer, matcher *ResourceMatcher, windower *TimeWindowFinder, store *VersionStore) *OrderPlanner {
	return &OrderPlanner{Scorer: scorer, Matcher: matcher, Windower: windower, Store: store}
}

func (p *OrderPlanner) Build(_ context.Context, input BuildPlanInput, rules *RuleSet) (*SchedulePlan, error) {
	if len(input.Orders) == 0 {
		return nil, errors.New("no orders to plan")
	}
	if len(input.Resources) == 0 {
		return nil, errors.New("no resources available")
	}
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
	if rules == nil {
		rules = DefaultRuleSet()
	}

	tasks := append([]Order(nil), input.Orders...)
	sort.SliceStable(tasks, func(i, j int) bool { return tasks[i].Priority > tasks[j].Priority })

	bestPlan := &SchedulePlan{ID: "plan-preview", Version: 1, Status: "draft"}
	var lastAssigned Order

	for _, task := range tasks {
		matchedResources := p.Matcher.Match(task, input.Resources, input.Calendar, rules)
		var bestScore CandidateScore
		bestScore.Score = -1e9
		var selectedResource Resource
		var selectedWindow TimeWindowCandidate
		found := false

		for _, resource := range matchedResources {
			windows := p.Windower.Find(task, resource, input.Calendar, rules)
			for _, window := range windows {
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

		lastAssigned = task
		bestPlan.OrderID = lastAssigned.ID
		bestPlan.ResourceID = selectedResource.ID
		bestPlan.StartAt = selectedWindow.StartAt
		bestPlan.EndAt = selectedWindow.EndAt
		bestPlan.Status = "scheduled"
	}

	return bestPlan, nil
}

package apsschedulingengine

import (
	"context"
	"errors"
	"time"
	apscalendar "xdfc-server/modules/aps-scheduling-engine/models/calendar"
	apsorder "xdfc-server/modules/aps-scheduling-engine/models/order"
	apsresource "xdfc-server/modules/aps-scheduling-engine/models/resource"
)

type CalendarDay = apscalendar.CalendarDay

type Order = apsorder.Order

type Resource = apsresource.Resource

type SchedulePlan struct {
	ID         string
	Version    int
	OrderID    string
	ResourceID string
	StartAt    time.Time
	EndAt      time.Time
	Status     string
}

type ScheduleEvent struct {
	ID         string
	Type       string
	OccurredAt time.Time
	Payload    map[string]any
}

type BuildPlanInput struct {
	Orders    []Order
	Resources []Resource
	Calendar  []CalendarDay
	Events    []ScheduleEvent
}

type RuleSet struct {
	PriorityOrder       []string
	HolidayStopsPlan    bool
	StopDayHardBlock    bool
	PreferWorkday       bool
	AllowOvertime       bool
	WorkdayBonus        float64
	OvertimeBonus       float64
	HolidayPenalty      float64
	ConflictPenalty     float64
	StopDayBlockPenalty float64
}

type TimeWindowCandidate struct {
	StartAt      time.Time
	EndAt        time.Time
	WorkdayFlag  bool
	OvertimeFlag bool
	HolidayFlag  bool
	StopDayFlag  bool
	Conflict     bool
	Score        float64
	Reasons      []string
}

type Planner struct{}

type Engine struct {
	Planner *Planner
	Rules   *RuleSet
}

func NewEngine() *Engine {
	return &Engine{Planner: &Planner{}, Rules: DefaultRuleSet()}
}

func DefaultRuleSet() *RuleSet {
	return &RuleSet{
		PriorityOrder:       []string{"urgent", "due_soon", "normal", "deferred"},
		HolidayStopsPlan:    true,
		StopDayHardBlock:    true,
		PreferWorkday:       true,
		AllowOvertime:       true,
		WorkdayBonus:        15,
		OvertimeBonus:       5,
		HolidayPenalty:      120,
		ConflictPenalty:     100,
		StopDayBlockPenalty: 1000,
	}
}

func (e *Engine) BuildPlan(ctx context.Context, input BuildPlanInput) (*SchedulePlan, error) {
	if e == nil {
		e = NewEngine()
	}
	if e.Planner == nil {
		e.Planner = &Planner{}
	}
	if e.Rules == nil {
		e.Rules = DefaultRuleSet()
	}
	return e.Planner.Build(ctx, input, e.Rules)
}

func (p *Planner) Build(_ context.Context, input BuildPlanInput, rules *RuleSet) (*SchedulePlan, error) {
	if len(input.Orders) == 0 {
		return nil, errors.New("no orders to plan")
	}
	if len(input.Resources) == 0 {
		return nil, errors.New("no resources available")
	}
	if rules == nil {
		rules = DefaultRuleSet()
	}

	bestResource, bestWindow, err := selectBestAssignment(input, rules)
	if err != nil {
		return nil, err
	}

	order := input.Orders[0]
	return &SchedulePlan{
		ID:         order.ID,
		Version:    1,
		OrderID:    order.ID,
		ResourceID: bestResource.ID,
		StartAt:    bestWindow.StartAt,
		EndAt:      bestWindow.EndAt,
		Status:     "scheduled",
	}, nil
}

func (p *Planner) Recalculate(ctx context.Context, _ ScheduleEvent, input BuildPlanInput, current *SchedulePlan, rules *RuleSet) (*SchedulePlan, error) {
	next, err := p.Build(ctx, input, rules)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return next, nil
	}

	recalculated := *next
	if current.Version <= 0 {
		recalculated.Version = 1
	} else {
		recalculated.Version = current.Version + 1
	}
	if recalculated.Status == "" {
		recalculated.Status = "scheduled"
	}
	return &recalculated, nil
}

func selectBestAssignment(input BuildPlanInput, rules *RuleSet) (Resource, TimeWindowCandidate, error) {
	order := input.Orders[0]
	bestScore := -1e9
	var bestResource Resource
	var bestWindow TimeWindowCandidate
	found := false

	for _, resource := range input.Resources {
		if !resource.Available {
			continue
		}
		windows := buildTimeWindows(input.Calendar, rules)
		for _, window := range windows {
			score, reasons, allowed := scoreWindow(order, resource, window, rules)
			if !allowed {
				continue
			}
			window.Score = score
			window.Reasons = reasons
			if !found || score > bestScore {
				bestScore = score
				bestResource = resource
				bestWindow = window
				found = true
			}
		}
	}

	if !found {
		return Resource{}, TimeWindowCandidate{}, errors.New("no schedulable calendar window")
	}

	return bestResource, bestWindow, nil
}

func buildTimeWindows(calendar []CalendarDay, rules *RuleSet) []TimeWindowCandidate {
	result := make([]TimeWindowCandidate, 0, len(calendar))
	for _, day := range calendar {
		window := TimeWindowCandidate{
			StartAt:      time.Date(day.Date.Year(), day.Date.Month(), day.Date.Day(), 8, 0, 0, 0, day.Date.Location()),
			EndAt:        time.Date(day.Date.Year(), day.Date.Month(), day.Date.Day(), 16, 0, 0, 0, day.Date.Location()),
			WorkdayFlag:  day.IsWorkday,
			OvertimeFlag: day.IsOvertime,
			HolidayFlag:  day.IsHoliday,
			StopDayFlag:  day.IsStopDay,
			Conflict:     (!day.IsWorkday && !day.IsOvertime) || (rules != nil && rules.HolidayStopsPlan && day.IsHoliday) || (rules != nil && rules.StopDayHardBlock && day.IsStopDay),
		}
		result = append(result, window)
	}
	if len(result) > 0 {
		return result
	}

	now := time.Now()
	return []TimeWindowCandidate{{
		StartAt:      now,
		EndAt:        now.Add(2 * time.Hour),
		WorkdayFlag:  true,
		OvertimeFlag: false,
		HolidayFlag:  false,
		StopDayFlag:  false,
		Conflict:     false,
	}}
}

func scoreWindow(task Order, resource Resource, window TimeWindowCandidate, rules *RuleSet) (float64, []string, bool) {
	if rules == nil {
		rules = DefaultRuleSet()
	}

	if rules.StopDayHardBlock && window.StopDayFlag {
		return -rules.StopDayBlockPenalty, []string{"stop_day_blocked"}, false
	}
	if rules.HolidayStopsPlan && window.HolidayFlag {
		return -rules.HolidayPenalty, []string{"holiday_blocked"}, false
	}
	if window.OvertimeFlag && !rules.AllowOvertime {
		return -rules.ConflictPenalty, []string{"overtime_not_allowed"}, false
	}

	score := 0.0
	reasons := make([]string, 0, 8)
	if task.Priority > 0 {
		score += float64(task.Priority) * 10
		reasons = append(reasons, "priority")
	}
	if resource.Available {
		score += 20
		reasons = append(reasons, "resource_available")
	}
	if rules.PreferWorkday && window.WorkdayFlag {
		score += rules.WorkdayBonus
		reasons = append(reasons, "workday")
	}
	if window.OvertimeFlag {
		score += rules.OvertimeBonus
		reasons = append(reasons, "overtime")
	}
	if task.AllowSplit {
		score += 2
		reasons = append(reasons, "splittable")
	}
	if window.HolidayFlag {
		score -= rules.HolidayPenalty
		reasons = append(reasons, "holiday_penalty")
	}
	if window.Conflict {
		score -= rules.ConflictPenalty
		reasons = append(reasons, "conflict")
	}

	return score, reasons, true
}

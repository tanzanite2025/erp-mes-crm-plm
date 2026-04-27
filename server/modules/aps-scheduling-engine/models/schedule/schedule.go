package schedule

import (
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
	Source     string
	TargetID   string
	OccurredAt time.Time
	Payload    map[string]any
}

type BuildPlanInput struct {
	Orders    []Order
	Resources []Resource
	Calendar  []CalendarDay
	Events    []ScheduleEvent
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

type ScheduleVersion struct {
	ID          string
	Version     int
	TriggerType string
	CreatedAt   time.Time
}

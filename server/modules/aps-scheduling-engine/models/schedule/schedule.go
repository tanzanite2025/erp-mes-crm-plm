package apsschedulingengine

import "time"

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

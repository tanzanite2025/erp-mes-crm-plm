package apsschedulingengine

import "time"

type AttendanceHook struct{}

func (h *AttendanceHook) Supports(targetType string) bool {
	return targetType == "attendance"
}

func (h *AttendanceHook) BuildEvent(target HookTarget, payload map[string]any) ScheduleEvent {
	return ScheduleEvent{
		ID:         "evt-attendance",
		Type:       "attendance",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload:    payload,
	}
}

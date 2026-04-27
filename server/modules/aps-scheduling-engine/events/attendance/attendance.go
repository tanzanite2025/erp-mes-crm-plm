package attendance

import (
	"time"
	apsevents "xdfc-server/modules/aps-scheduling-engine/events"
)

type AttendanceHook struct{}

func (h *AttendanceHook) Supports(targetType string) bool {
	return targetType == "attendance"
}

func (h *AttendanceHook) BuildEvent(target apsevents.HookTarget, payload map[string]any) apsevents.ScheduleEvent {
	return apsevents.ScheduleEvent{
		ID:         "evt-attendance",
		Type:       "attendance",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload:    payload,
	}
}

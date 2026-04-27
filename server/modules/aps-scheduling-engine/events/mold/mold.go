package mold

import (
	"time"
	apsevents "xdfc-server/modules/aps-scheduling-engine/events"
)

type MoldHook struct{}

func (h *MoldHook) Supports(targetType string) bool {
	return targetType == "mold"
}

func (h *MoldHook) BuildEvent(target apsevents.HookTarget, payload map[string]any) apsevents.ScheduleEvent {
	status := "unknown"
	if raw, ok := payload["status"].(string); ok && raw != "" {
		status = raw
	}

	return apsevents.ScheduleEvent{
		ID:         "evt-mold",
		Type:       "mold",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload: map[string]any{
			"status": status,
			"note":   payload["note"],
		},
	}
}

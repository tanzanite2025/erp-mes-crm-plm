package apsschedulingengine

import "time"

type MoldHook struct{}

func (h *MoldHook) Supports(targetType string) bool {
	return targetType == "mold"
}

func (h *MoldHook) BuildEvent(target HookTarget, payload map[string]any) ScheduleEvent {
	status := "unknown"
	if raw, ok := payload["status"].(string); ok && raw != "" {
		status = raw
	}

	return ScheduleEvent{
		ID:         "evt-mold",
		Type:       "mold",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload:    map[string]any{
			"status": status,
			"note":   payload["note"],
		},
	}
}

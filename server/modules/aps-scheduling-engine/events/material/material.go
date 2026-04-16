package apsschedulingengine

import "time"

type MaterialHook struct{}

func (h *MaterialHook) Supports(targetType string) bool {
	return targetType == "material"
}

func (h *MaterialHook) BuildEvent(target HookTarget, payload map[string]any) ScheduleEvent {
	return ScheduleEvent{
		ID:         "evt-material",
		Type:       "material",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload:    payload,
	}
}

package material

import (
	"time"
	apsevents "xdfc-server/modules/aps-scheduling-engine/events"
)

type MaterialHook struct{}

func (h *MaterialHook) Supports(targetType string) bool {
	return targetType == "material"
}

func (h *MaterialHook) BuildEvent(target apsevents.HookTarget, payload map[string]any) apsevents.ScheduleEvent {
	return apsevents.ScheduleEvent{
		ID:         "evt-material",
		Type:       "material",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload:    payload,
	}
}

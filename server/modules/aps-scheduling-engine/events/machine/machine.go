package machine

import (
	"time"
	apsevents "xdfc-server/modules/aps-scheduling-engine/events"
)

type MachineHook struct{}

func (h *MachineHook) Supports(targetType string) bool {
	return targetType == "machine"
}

func (h *MachineHook) BuildEvent(target apsevents.HookTarget, payload map[string]any) apsevents.ScheduleEvent {
	return apsevents.ScheduleEvent{
		ID:         "evt-machine",
		Type:       "machine",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload:    payload,
	}
}

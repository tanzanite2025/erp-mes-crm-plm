package apsschedulingengine

import "time"

type MachineHook struct{}

func (h *MachineHook) Supports(targetType string) bool {
	return targetType == "machine"
}

func (h *MachineHook) BuildEvent(target HookTarget, payload map[string]any) ScheduleEvent {
	return ScheduleEvent{
		ID:         "evt-machine",
		Type:       "machine",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload:    payload,
	}
}

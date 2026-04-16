package apsschedulingengine

import "time"

type BarcodeHook struct{}

func (h *BarcodeHook) Supports(targetType string) bool {
	return targetType == "barcode"
}

func (h *BarcodeHook) BuildEvent(target HookTarget, payload map[string]any) ScheduleEvent {
	return ScheduleEvent{
		ID:         "evt-barcode",
		Type:       "barcode",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload:    payload,
	}
}

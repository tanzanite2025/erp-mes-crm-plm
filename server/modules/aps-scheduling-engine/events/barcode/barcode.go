package barcode

import (
	"time"
	apsevents "xdfc-server/modules/aps-scheduling-engine/events"
)

type BarcodeHook struct{}

func (h *BarcodeHook) Supports(targetType string) bool {
	return targetType == "barcode"
}

func (h *BarcodeHook) BuildEvent(target apsevents.HookTarget, payload map[string]any) apsevents.ScheduleEvent {
	return apsevents.ScheduleEvent{
		ID:         "evt-barcode",
		Type:       "barcode",
		Source:     target.Type,
		TargetID:   target.ID,
		OccurredAt: time.Now(),
		Payload:    payload,
	}
}

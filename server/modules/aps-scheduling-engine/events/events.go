package events

type EventRouter struct{}

func NewEventRouter() *EventRouter {
	return &EventRouter{}
}

func (r *EventRouter) Route(event ScheduleEvent) string {
	switch event.Type {
	case "barcode":
		return "local"
	case "attendance":
		return "local"
	case "material":
		return "local"
	case "mold":
		return "local"
	case "machine":
		return "global"
	case "holiday":
		return "global"
	case "overtime":
		return "global"
	default:
		return "global"
	}
}

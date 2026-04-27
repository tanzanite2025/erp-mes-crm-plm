package events

func IsBarcodeEvent(e ScheduleEvent) bool {
	return e.Type == "barcode"
}

func IsAttendanceEvent(e ScheduleEvent) bool {
	return e.Type == "attendance"
}

func IsMachineEvent(e ScheduleEvent) bool {
	return e.Type == "machine"
}

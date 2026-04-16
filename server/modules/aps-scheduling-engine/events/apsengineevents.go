package apsschedulingengine

func (e ScheduleEvent) IsBarcodeEvent() bool {
	return e.Type == "barcode"
}

func (e ScheduleEvent) IsAttendanceEvent() bool {
	return e.Type == "attendance"
}

func (e ScheduleEvent) IsMachineEvent() bool {
	return e.Type == "machine"
}

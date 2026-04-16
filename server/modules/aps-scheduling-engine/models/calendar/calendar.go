package apsschedulingengine

import "time"

type CalendarDay struct {
	Date       time.Time
	IsWorkday  bool
	IsHoliday  bool
	IsOvertime bool
	IsStopDay  bool
}

package windowing

import (
	"time"
	apscalendar "xdfc-server/modules/aps-scheduling-engine/models/calendar"
	apsorder "xdfc-server/modules/aps-scheduling-engine/models/order"
	apsresource "xdfc-server/modules/aps-scheduling-engine/models/resource"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type TimeWindowFinder struct{}

func NewTimeWindowFinder() *TimeWindowFinder {
	return &TimeWindowFinder{}
}

func (f *TimeWindowFinder) Find(task apsorder.Order, resource apsresource.Resource, calendar []apscalendar.CalendarDay, rules *apsrules.RuleSet) []apsschedule.TimeWindowCandidate {
	if rules == nil {
		rules = apsrules.DefaultRuleSet()
	}

	start := time.Now()
	result := make([]apsschedule.TimeWindowCandidate, 0, len(calendar)+1)

	for _, day := range calendar {
		window := apsschedule.TimeWindowCandidate{
			StartAt:      time.Date(day.Date.Year(), day.Date.Month(), day.Date.Day(), 8, 0, 0, 0, day.Date.Location()),
			EndAt:        time.Date(day.Date.Year(), day.Date.Month(), day.Date.Day(), 16, 0, 0, 0, day.Date.Location()),
			WorkdayFlag:  day.IsWorkday,
			OvertimeFlag: day.IsOvertime,
			HolidayFlag:  day.IsHoliday,
			StopDayFlag:  day.IsStopDay,
			Conflict:     (!day.IsWorkday && !day.IsOvertime) || (rules.HolidayStopsPlan && day.IsHoliday) || (rules.StopDayHardBlock && day.IsStopDay),
			Score:        0,
		}
		result = append(result, window)
	}

	if len(result) == 0 {
		result = append(result, apsschedule.TimeWindowCandidate{
			StartAt:      start,
			EndAt:        start.Add(2 * time.Hour),
			WorkdayFlag:  true,
			OvertimeFlag: false,
			HolidayFlag:  false,
			StopDayFlag:  false,
			Conflict:     false,
			Score:        1,
		})
	}

	return result
}

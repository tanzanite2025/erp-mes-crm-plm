package apsschedulingengine

import "time"

type TimeWindowFinder struct{}

func NewTimeWindowFinder() *TimeWindowFinder {
	return &TimeWindowFinder{}
}

func (f *TimeWindowFinder) Find(task Order, resource Resource, calendar []CalendarDay, rules *RuleSet) []TimeWindowCandidate {
	start := time.Now()
	result := make([]TimeWindowCandidate, 0, len(calendar)+1)

	for _, day := range calendar {
		window := TimeWindowCandidate{
			StartAt:      time.Date(day.Date.Year(), day.Date.Month(), day.Date.Day(), 8, 0, 0, 0, day.Date.Location()),
			EndAt:        time.Date(day.Date.Year(), day.Date.Month(), day.Date.Day(), 16, 0, 0, 0, day.Date.Location()),
			WorkdayFlag:  day.IsWorkday,
			OvertimeFlag: day.IsOvertime,
			HolidayFlag:  day.IsHoliday,
			Conflict:     !day.IsWorkday && !day.IsOvertime,
			Score:        0,
		}
		result = append(result, window)
	}

	if len(result) == 0 {
		result = append(result, TimeWindowCandidate{
			StartAt:      start,
			EndAt:        start.Add(2 * time.Hour),
			WorkdayFlag:  true,
			OvertimeFlag: false,
			HolidayFlag:  false,
			Conflict:     false,
			Score:        1,
		})
	}

	return result
}

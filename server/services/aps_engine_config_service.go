package services

import (
	"context"
	"fmt"
	"strings"
	"time"
	apsschedulingengine "xdfc-server/modules/aps-scheduling-engine/models/calendar"
)

const (
	ApsEngineDateRuleSourceTypeSystemDefault = "system_default"
	ApsEngineDateRuleSourceStatusActive      = "active"
	ApsEngineWeekendPolicyRestDay            = "rest_day"
	ApsEngineHolidayPolicyIgnore             = "ignore"
	apsEngineCalendarDateLayout              = "2006-01-02"
	defaultApsCalendarRangeDays              = 14
	maxApsCalendarRangeDays                  = 62
)

type ApsEngineDateRuleRange struct {
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
	Days      int    `json:"days"`
}

type ApsEngineCalendarDay struct {
	Date       string `json:"date"`
	IsWorkday  bool   `json:"isWorkday"`
	IsHoliday  bool   `json:"isHoliday"`
	IsOvertime bool   `json:"isOvertime"`
	IsStopDay  bool   `json:"isStopDay"`
	SourceType string `json:"sourceType"`
	Label      string `json:"label,omitempty"`
}

type ApsEngineDateRuleQuery struct {
	StartDate time.Time
	EndDate   time.Time
}

type ApsEngineDateRuleSnapshot struct {
	ConsidersWorkdays bool                   `json:"considersWorkdays"`
	WeekendPolicy     string                 `json:"weekendPolicy"`
	HolidayPolicy     string                 `json:"holidayPolicy"`
	SourceType        string                 `json:"sourceType"`
	SourceStatus      string                 `json:"sourceStatus"`
	Range             ApsEngineDateRuleRange `json:"range"`
	CalendarDays      []ApsEngineCalendarDay `json:"calendarDays"`
}

func BuildApsEngineCalendarDays(calendarDays []ApsEngineCalendarDay) []apsschedulingengine.CalendarDay {
	result := make([]apsschedulingengine.CalendarDay, 0, len(calendarDays))
	for _, item := range calendarDays {
		date, err := time.Parse(apsEngineCalendarDateLayout, item.Date)
		if err != nil {
			continue
		}
		result = append(result, apsschedulingengine.CalendarDay{
			Date:       date,
			IsWorkday:  item.IsWorkday,
			IsHoliday:  item.IsHoliday,
			IsOvertime: item.IsOvertime,
			IsStopDay:  item.IsStopDay,
		})
	}
	return result
}

func ParseApsEngineDateRuleQuery(startDateRaw string, endDateRaw string) (ApsEngineDateRuleQuery, error) {
	now := time.Now()
	startDate, err := parseApsEngineDateRuleDate(startDateRaw)
	if err != nil {
		return ApsEngineDateRuleQuery{}, err
	}
	endDate, err := parseApsEngineDateRuleDate(endDateRaw)
	if err != nil {
		return ApsEngineDateRuleQuery{}, err
	}

	query := ApsEngineDateRuleQuery{
		StartDate: startDate,
		EndDate:   endDate,
	}

	return normalizeApsEngineDateRuleQuery(query, now)
}

func parseApsEngineDateRuleDate(raw string) (time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return time.Time{}, nil
	}
	date, err := time.Parse(apsEngineCalendarDateLayout, trimmed)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date format: %s", trimmed)
	}
	return date, nil
}

func normalizeApsEngineDateRuleQuery(query ApsEngineDateRuleQuery, now time.Time) (ApsEngineDateRuleQuery, error) {
	baseDate := normalizeApsEngineDate(now)
	startDate := normalizeApsEngineDate(query.StartDate)
	endDate := normalizeApsEngineDate(query.EndDate)

	if startDate.IsZero() {
		startDate = baseDate
	}
	if endDate.IsZero() {
		endDate = startDate.AddDate(0, 0, defaultApsCalendarRangeDays-1)
	}
	if endDate.Before(startDate) {
		return ApsEngineDateRuleQuery{}, fmt.Errorf("endDate must be on or after startDate")
	}
	if queryDayCount(ApsEngineDateRuleQuery{StartDate: startDate, EndDate: endDate}) > maxApsCalendarRangeDays {
		return ApsEngineDateRuleQuery{}, fmt.Errorf("date range exceeds max supported days: %d", maxApsCalendarRangeDays)
	}

	return ApsEngineDateRuleQuery{StartDate: startDate, EndDate: endDate}, nil
}

func normalizeApsEngineDate(date time.Time) time.Time {
	if date.IsZero() {
		return time.Time{}
	}
	return time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
}

func buildDefaultApsEngineDateRuleQuery(now time.Time) ApsEngineDateRuleQuery {
	startDate := normalizeApsEngineDate(now)
	return ApsEngineDateRuleQuery{
		StartDate: startDate,
		EndDate:   startDate.AddDate(0, 0, defaultApsCalendarRangeDays-1),
	}
}

func queryDayCount(query ApsEngineDateRuleQuery) int {
	if query.StartDate.IsZero() || query.EndDate.IsZero() || query.EndDate.Before(query.StartDate) {
		return 0
	}
	return int(query.EndDate.Sub(query.StartDate).Hours()/24) + 1
}

func buildApsEngineDateRuleRange(query ApsEngineDateRuleQuery) ApsEngineDateRuleRange {
	return ApsEngineDateRuleRange{
		StartDate: query.StartDate.Format(apsEngineCalendarDateLayout),
		EndDate:   query.EndDate.Format(apsEngineCalendarDateLayout),
		Days:      queryDayCount(query),
	}
}

func buildSystemDefaultApsEngineCalendarDay(date time.Time) ApsEngineCalendarDay {
	isWeekend := date.Weekday() == time.Saturday || date.Weekday() == time.Sunday
	return ApsEngineCalendarDay{
		Date:       date.Format(apsEngineCalendarDateLayout),
		IsWorkday:  !isWeekend,
		IsHoliday:  false,
		IsOvertime: false,
		IsStopDay:  isWeekend,
		SourceType: ApsEngineDateRuleSourceTypeSystemDefault,
		Label:      date.Weekday().String(),
	}
}

func buildSystemDefaultApsEngineCalendarDays(query ApsEngineDateRuleQuery) []ApsEngineCalendarDay {
	calendarDays := make([]ApsEngineCalendarDay, 0, queryDayCount(query))
	for cursor := query.StartDate; !cursor.After(query.EndDate); cursor = cursor.AddDate(0, 0, 1) {
		calendarDays = append(calendarDays, buildSystemDefaultApsEngineCalendarDay(cursor))
	}
	return calendarDays
}

func defaultApsEngineDateRuleSnapshot() ApsEngineDateRuleSnapshot {
	query := buildDefaultApsEngineDateRuleQuery(time.Now())
	return ApsEngineDateRuleSnapshot{
		ConsidersWorkdays: true,
		WeekendPolicy:     ApsEngineWeekendPolicyRestDay,
		HolidayPolicy:     ApsEngineHolidayPolicyIgnore,
		SourceType:        ApsEngineDateRuleSourceTypeSystemDefault,
		SourceStatus:      ApsEngineDateRuleSourceStatusActive,
		Range:             buildApsEngineDateRuleRange(query),
		CalendarDays:      buildSystemDefaultApsEngineCalendarDays(query),
	}
}

func GetApsEngineDateRuleSnapshot(ctx context.Context, query ApsEngineDateRuleQuery) ApsEngineDateRuleSnapshot {
	_ = ctx
	normalizedQuery, err := normalizeApsEngineDateRuleQuery(query, time.Now())
	if err != nil {
		return defaultApsEngineDateRuleSnapshot()
	}

	return ApsEngineDateRuleSnapshot{
		ConsidersWorkdays: true,
		WeekendPolicy:     ApsEngineWeekendPolicyRestDay,
		HolidayPolicy:     ApsEngineHolidayPolicyIgnore,
		SourceType:        ApsEngineDateRuleSourceTypeSystemDefault,
		SourceStatus:      ApsEngineDateRuleSourceStatusActive,
		Range:             buildApsEngineDateRuleRange(normalizedQuery),
		CalendarDays:      buildSystemDefaultApsEngineCalendarDays(normalizedQuery),
	}
}

package services

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestGetApsEngineDateRuleSnapshotReturnsSystemDefaultSnapshot(t *testing.T) {
	snapshot := GetApsEngineDateRuleSnapshot(context.Background(), ApsEngineDateRuleQuery{})
	require.Equal(t, ApsEngineDateRuleSourceTypeSystemDefault, snapshot.SourceType)
	require.Equal(t, ApsEngineDateRuleSourceStatusActive, snapshot.SourceStatus)
	require.Equal(t, ApsEngineWeekendPolicyRestDay, snapshot.WeekendPolicy)
	require.Equal(t, ApsEngineHolidayPolicyIgnore, snapshot.HolidayPolicy)
	require.Len(t, snapshot.CalendarDays, defaultApsCalendarRangeDays)
}

func TestParseApsEngineDateRuleQueryRejectsReverseRange(t *testing.T) {
	_, err := ParseApsEngineDateRuleQuery("2026-04-24", "2026-04-23")
	require.Error(t, err)
}

func TestGetApsEngineDateRuleSnapshotReturnsRequestedRangeCalendarDays(t *testing.T) {
	snapshot := GetApsEngineDateRuleSnapshot(context.Background(), ApsEngineDateRuleQuery{
		StartDate: time.Date(2026, 4, 23, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 4, 25, 0, 0, 0, 0, time.UTC),
	})
	require.Equal(t, 3, snapshot.Range.Days)
	require.Len(t, snapshot.CalendarDays, 3)
	require.Equal(t, ApsEngineDateRuleSourceStatusActive, snapshot.SourceStatus)
}

func TestGetApsEngineDateRuleSnapshotMarksWeekendAsStopDay(t *testing.T) {
	snapshot := GetApsEngineDateRuleSnapshot(context.Background(), ApsEngineDateRuleQuery{
		StartDate: time.Date(2026, 4, 26, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 4, 26, 0, 0, 0, 0, time.UTC),
	})
	require.Equal(t, ApsEngineDateRuleSourceStatusActive, snapshot.SourceStatus)
	require.Len(t, snapshot.CalendarDays, 1)
	require.Equal(t, ApsEngineDateRuleSourceTypeSystemDefault, snapshot.CalendarDays[0].SourceType)
	require.True(t, snapshot.CalendarDays[0].IsStopDay)
}

func TestBuildApsEngineCalendarDaysMapsToEngineModel(t *testing.T) {
	calendar := BuildApsEngineCalendarDays([]ApsEngineCalendarDay{{
		Date:       "2026-04-23",
		IsWorkday:  true,
		IsHoliday:  false,
		IsOvertime: false,
		IsStopDay:  false,
	}})
	require.Len(t, calendar, 1)
	require.Equal(t, 2026, calendar[0].Date.Year())
	require.True(t, calendar[0].IsWorkday)
}

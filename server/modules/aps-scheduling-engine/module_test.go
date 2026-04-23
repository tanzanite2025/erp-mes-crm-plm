package apsschedulingengine

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func testCalendarDay(date string, isWorkday bool, isHoliday bool, isOvertime bool, isStopDay bool) CalendarDay {
	parsed, _ := time.Parse("2006-01-02", date)
	return CalendarDay{
		Date:       parsed,
		IsWorkday:  isWorkday,
		IsHoliday:  isHoliday,
		IsOvertime: isOvertime,
		IsStopDay:  isStopDay,
	}
}

func TestEngineBuildPlanPrefersWorkdayOverOvertime(t *testing.T) {
	engine := NewEngine()
	plan, err := engine.BuildPlan(context.Background(), BuildPlanInput{
		Orders:    []Order{{ID: "order-1", OrderNo: "order-1", Priority: 1, Status: "pending"}},
		Resources: []Resource{{ID: "resource-1", Available: true}},
		Calendar: []CalendarDay{
			testCalendarDay("2026-04-26", false, false, true, false),
			testCalendarDay("2026-04-25", true, false, false, false),
		},
	})
	require.NoError(t, err)
	require.Equal(t, "2026-04-25", plan.StartAt.Format("2006-01-02"))
}

func TestEngineBuildPlanBlocksHolidayWhenHolidayStopsPlan(t *testing.T) {
	engine := NewEngine()
	plan, err := engine.BuildPlan(context.Background(), BuildPlanInput{
		Orders:    []Order{{ID: "order-1", OrderNo: "order-1", Priority: 1, Status: "pending"}},
		Resources: []Resource{{ID: "resource-1", Available: true}},
		Calendar: []CalendarDay{
			testCalendarDay("2026-05-01", true, true, false, false),
			testCalendarDay("2026-05-02", true, false, false, false),
		},
	})
	require.NoError(t, err)
	require.Equal(t, "2026-05-02", plan.StartAt.Format("2006-01-02"))
}

func TestEngineBuildPlanBlocksStopDay(t *testing.T) {
	engine := NewEngine()
	plan, err := engine.BuildPlan(context.Background(), BuildPlanInput{
		Orders:    []Order{{ID: "order-1", OrderNo: "order-1", Priority: 1, Status: "pending"}},
		Resources: []Resource{{ID: "resource-1", Available: true}},
		Calendar: []CalendarDay{
			testCalendarDay("2026-05-03", false, false, false, true),
			testCalendarDay("2026-05-04", true, false, false, false),
		},
	})
	require.NoError(t, err)
	require.Equal(t, "2026-05-04", plan.StartAt.Format("2006-01-02"))
}

func TestEngineBuildPlanUsesOvertimeWhenItIsOnlySchedulableOption(t *testing.T) {
	engine := NewEngine()
	plan, err := engine.BuildPlan(context.Background(), BuildPlanInput{
		Orders:    []Order{{ID: "order-1", OrderNo: "order-1", Priority: 1, Status: "pending"}},
		Resources: []Resource{{ID: "resource-1", Available: true}},
		Calendar: []CalendarDay{
			testCalendarDay("2026-05-05", false, false, true, false),
		},
	})
	require.NoError(t, err)
	require.Equal(t, "2026-05-05", plan.StartAt.Format("2006-01-02"))
}

func TestEngineBuildPlanReturnsErrorWhenOnlyHolidayAndStopDayExist(t *testing.T) {
	engine := NewEngine()
	_, err := engine.BuildPlan(context.Background(), BuildPlanInput{
		Orders:    []Order{{ID: "order-1", OrderNo: "order-1", Priority: 1, Status: "pending"}},
		Resources: []Resource{{ID: "resource-1", Available: true}},
		Calendar: []CalendarDay{
			testCalendarDay("2026-05-01", true, true, false, false),
			testCalendarDay("2026-05-03", false, false, false, true),
		},
	})
	require.Error(t, err)
}

func TestPlannerRecalculateKeepsCalendarSemantics(t *testing.T) {
	engine := NewEngine()
	current := &SchedulePlan{ID: "plan-1", Version: 1, Status: "draft"}
	plan, err := engine.Planner.Recalculate(context.Background(), ScheduleEvent{Type: "calendar.changed"}, BuildPlanInput{
		Orders:    []Order{{ID: "order-1", OrderNo: "order-1", Priority: 1, Status: "pending"}},
		Resources: []Resource{{ID: "resource-1", Available: true}},
		Calendar: []CalendarDay{
			testCalendarDay("2026-05-01", true, true, false, false),
			testCalendarDay("2026-05-02", true, false, false, false),
		},
	}, current, engine.Rules)
	require.NoError(t, err)
	require.Equal(t, 2, plan.Version)
	require.Equal(t, "2026-05-02", plan.StartAt.Format("2006-01-02"))
}

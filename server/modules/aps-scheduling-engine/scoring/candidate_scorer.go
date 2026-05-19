package scoring

import (
	"time"
	apsorder "xdfc-server/modules/aps-scheduling-engine/models/order"
	apsresource "xdfc-server/modules/aps-scheduling-engine/models/resource"
	apsschedule "xdfc-server/modules/aps-scheduling-engine/models/schedule"
	apsrules "xdfc-server/modules/aps-scheduling-engine/rules"
)

type CandidateScore struct {
	TaskID      string
	ResourceID  string
	WindowStart time.Time
	WindowEnd   time.Time
	Score       float64
	Reasons     []string
}

type CandidateScorer struct{}

func NewCandidateScorer() *CandidateScorer {
	return &CandidateScorer{}
}

func (s *CandidateScorer) Score(task apsorder.Order, resource apsresource.Resource, window apsschedule.TimeWindowCandidate, rules *apsrules.RuleSet) CandidateScore {
	if rules == nil {
		rules = apsrules.DefaultRuleSet()
	}

	score := 0.0
	reasons := make([]string, 0, 6)

	if task.Priority > 0 {
		score += float64(task.Priority) * 10
		reasons = append(reasons, "priority")
	}
	if resource.Available {
		score += 20
		reasons = append(reasons, "resource_available")
	}
	if rules.PreferWorkday && window.WorkdayFlag {
		score += rules.WorkdayBonus
		reasons = append(reasons, "workday")
	}
	if window.OvertimeFlag {
		score += rules.OvertimeBonus
		reasons = append(reasons, "overtime")
	}
	if task.AllowSplit {
		score += 2
		reasons = append(reasons, "splittable")
	}
	if window.HolidayFlag {
		score -= rules.HolidayPenalty
		reasons = append(reasons, "holiday_penalty")
	}
	if window.Conflict {
		score -= rules.ConflictPenalty
		reasons = append(reasons, "conflict")
	}

	// 1. 交期与松弛时间规则评估
	slackScore, slackReasons := rules.SlackTime.Evaluate(task, window.EndAt)
	score += slackScore
	reasons = append(reasons, slackReasons...)

	// 2. 人员考勤与班组规则评估
	attendanceScore, attendanceReasons := rules.Attendance.Evaluate(task, resource, window)
	score += attendanceScore
	reasons = append(reasons, attendanceReasons...)

	return CandidateScore{
		TaskID:      task.ID,
		ResourceID:  resource.ID,
		WindowStart: window.StartAt,
		WindowEnd:   window.EndAt,
		Score:       score,
		Reasons:     reasons,
	}
}

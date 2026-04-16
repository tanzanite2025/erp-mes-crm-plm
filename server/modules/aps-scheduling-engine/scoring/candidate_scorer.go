package apsschedulingengine

import "time"

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

func (s *CandidateScorer) Score(task Order, resource Resource, window TimeWindowCandidate, rules *RuleSet) CandidateScore {
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
	if window.WorkdayFlag {
		score += 15
		reasons = append(reasons, "workday")
	}
	if window.OvertimeFlag {
		score += 5
		reasons = append(reasons, "overtime")
	}
	if task.AllowSplit {
		score += 2
		reasons = append(reasons, "splittable")
	}
	if window.Conflict {
		score -= 100
		reasons = append(reasons, "conflict")
	}

	return CandidateScore{
		TaskID:      task.ID,
		ResourceID:  resource.ID,
		WindowStart: window.StartAt,
		WindowEnd:   window.EndAt,
		Score:       score,
		Reasons:     reasons,
	}
}

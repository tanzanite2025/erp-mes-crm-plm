package rules

import (
	"time"
	apsorder "xdfc-server/modules/aps-scheduling-engine/models/order"
)

type SlackTimeRuleConfig struct {
	EnableSlackTimePenalty bool
	SlackThresholdDays     int
	SlackScalePenalty      float64
	OverduePenalty         float64
}

func DefaultSlackTimeRuleConfig() SlackTimeRuleConfig {
	return SlackTimeRuleConfig{
		EnableSlackTimePenalty: true,
		SlackThresholdDays:     3,
		SlackScalePenalty:      100.0,
		OverduePenalty:         1000.0,
	}
}

// Evaluate 计算交期预警与超期惩罚
func (c *SlackTimeRuleConfig) Evaluate(task apsorder.Order, endAt time.Time) (float64, []string) {
	if !c.EnableSlackTimePenalty || task.DueAt.IsZero() {
		return 0.0, nil
	}

	if endAt.After(task.DueAt) {
		return -c.OverduePenalty, []string{"overdue_penalty"}
	}

	slackDuration := task.DueAt.Sub(endAt)
	slackDays := slackDuration.Hours() / 24.0
	thresholdDays := float64(c.SlackThresholdDays)

	if slackDays >= 0 && slackDays < thresholdDays {
		penalty := (thresholdDays - slackDays) * c.SlackScalePenalty
		return -penalty, []string{"slack_warning"}
	}

	return 0.0, nil
}

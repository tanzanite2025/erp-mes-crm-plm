package apsschedulingengine

type RuleSet struct {
	PriorityOrder []string
}

func DefaultRuleSet() *RuleSet {
	return &RuleSet{
		PriorityOrder: []string{"urgent", "due_soon", "normal", "deferred"},
	}
}

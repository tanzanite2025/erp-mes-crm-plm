package rules

type RuleSet struct {
	PriorityOrder       []string
	HolidayStopsPlan    bool
	StopDayHardBlock    bool
	PreferWorkday       bool
	AllowOvertime       bool
	WorkdayBonus        float64
	OvertimeBonus       float64
	HolidayPenalty      float64
	ConflictPenalty     float64
	StopDayBlockPenalty float64
}

func DefaultRuleSet() *RuleSet {
	return &RuleSet{
		PriorityOrder:       []string{"urgent", "due_soon", "normal", "deferred"},
		HolidayStopsPlan:    true,
		StopDayHardBlock:    true,
		PreferWorkday:       true,
		AllowOvertime:       true,
		WorkdayBonus:        15,
		OvertimeBonus:       5,
		HolidayPenalty:      120,
		ConflictPenalty:     100,
		StopDayBlockPenalty: 1000,
	}
}

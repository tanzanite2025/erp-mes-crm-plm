package events

type ImpactScope struct {
	AffectedTaskIDs     []string
	AffectedResourceIDs []string
	LocalOnly           bool
	RequiresGlobal      bool
	Reason              string
}

type ImpactAnalyzer struct{}

func NewImpactAnalyzer() *ImpactAnalyzer {
	return &ImpactAnalyzer{}
}

func (a *ImpactAnalyzer) Analyze(event ScheduleEvent, currentPlan *SchedulePlan) ImpactScope {
	scope := ImpactScope{LocalOnly: true, Reason: event.Type}

	switch event.Type {
	case "barcode", "attendance", "material", "mold":
		scope.LocalOnly = true
		scope.RequiresGlobal = false
	case "machine", "holiday", "overtime":
		scope.LocalOnly = false
		scope.RequiresGlobal = true
	default:
		scope.LocalOnly = false
		scope.RequiresGlobal = true
	}

	if currentPlan != nil {
		scope.AffectedTaskIDs = []string{currentPlan.OrderID}
		scope.AffectedResourceIDs = []string{currentPlan.ResourceID}
	}

	return scope
}

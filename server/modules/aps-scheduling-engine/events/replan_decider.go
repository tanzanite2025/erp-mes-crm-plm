package apsschedulingengine

type ReplanMode string

const (
	ReplanModeIgnore ReplanMode = "ignore"
	ReplanModeLocal  ReplanMode = "local"
	ReplanModeGlobal ReplanMode = "global"
)

type ReplanDecider struct{}

func NewReplanDecider() *ReplanDecider {
	return &ReplanDecider{}
}

func (d *ReplanDecider) Decide(scope ImpactScope) ReplanMode {
	if scope.RequiresGlobal {
		return ReplanModeGlobal
	}
	if len(scope.AffectedTaskIDs) == 0 && len(scope.AffectedResourceIDs) == 0 {
		return ReplanModeIgnore
	}
	return ReplanModeLocal
}

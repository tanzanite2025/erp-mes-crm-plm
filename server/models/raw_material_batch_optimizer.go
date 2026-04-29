package models

type RawMaterialBatchOptimizerRollInput struct {
	RollID          string  `json:"rollId"`
	PrepregSpecID   string  `json:"prepregSpecId"`
	RollWidthMM     float64 `json:"rollWidthMm"`
	RollLengthM     float64 `json:"rollLengthM"`
	RemainingAreaM2 float64 `json:"remainingAreaM2"`
	EdgeTrimMM      float64 `json:"edgeTrimMm"`
	Status          string  `json:"status"`
}

type RawMaterialBatchOptimizerDemandLineInput struct {
	DemandLineID      string   `json:"demandLineId"`
	CutSizeUnitID     string   `json:"cutSizeUnitId"`
	WidthMM           float64  `json:"widthMm"`
	LengthMM          float64  `json:"lengthMm"`
	PieceCountPerSet  int      `json:"pieceCountPerSet"`
	RequiredSets      int      `json:"requiredSets"`
	RequiredPieces    int      `json:"requiredPieces"`
	LayupCount        int      `json:"layupCount"`
	CutAngle          float64  `json:"cutAngle"`
	UsageType         string   `json:"usageType"`
	Priority          int      `json:"priority"`
	AllowMixedPlan    bool     `json:"allowMixedPlan"`
	MustFulfill       bool     `json:"mustFulfill"`
	RollGroupKey      string   `json:"rollGroupKey"`
	OrderSequence     int      `json:"orderSequence"`
	YarnDirectionMode string   `json:"yarnDirectionMode"`
	ProcessTags       []string `json:"processTags"`
	NoteKeywords      []string `json:"noteKeywords"`
}

type RawMaterialBatchOptimizerSolveRequest struct {
	Rolls             []RawMaterialBatchOptimizerRollInput       `json:"rolls"`
	DemandLines       []RawMaterialBatchOptimizerDemandLineInput `json:"demandLines"`
	KnifeGapMM        float64                                    `json:"knifeGapMm"`
	DefaultEdgeTrimMM float64                                    `json:"defaultEdgeTrimMm"`
	ObjectivePreset   string                                     `json:"objectivePreset"`
	ScoreWeights      RawMaterialBatchOptimizerScoreWeights      `json:"scoreWeights"`
	MaxCandidatePlans int                                        `json:"maxCandidatePlans"`
	TimeLimitMs       int                                        `json:"timeLimitMs"`
}

type RawMaterialBatchOptimizerScoreWeights struct {
	FulfilledWeight          float64 `json:"fulfilledWeight"`
	UtilizationWeight        float64 `json:"utilizationWeight"`
	StabilityWeight          float64 `json:"stabilityWeight"`
	AssignmentPenaltyWeight  float64 `json:"assignmentPenaltyWeight"`
	UnfulfilledPenaltyWeight float64 `json:"unfulfilledPenaltyWeight"`
	SplitPenaltyWeight       float64 `json:"splitPenaltyWeight"`
	MustPenaltyWeight        float64 `json:"mustPenaltyWeight"`
}

type RawMaterialBatchOptimizerPlanAssignment struct {
	RollID          string `json:"rollId"`
	DemandLineID    string `json:"demandLineId"`
	AllocatedSets   int    `json:"allocatedSets"`
	AllocatedPieces int    `json:"allocatedPieces"`
}

type RawMaterialBatchOptimizerUnfulfilledLine struct {
	DemandLineID    string `json:"demandLineId"`
	RemainingSets   int    `json:"remainingSets"`
	RemainingPieces int    `json:"remainingPieces"`
	Reason          string `json:"reason"`
}

type RawMaterialBatchOptimizerPlanLayoutRollSummary struct {
	RollID             string  `json:"rollId"`
	AllocatedSets      int     `json:"allocatedSets"`
	AllocatedPieces    int     `json:"allocatedPieces"`
	UtilizedAreaM2     float64 `json:"utilizedAreaM2"`
	UtilizationPercent float64 `json:"utilizationPercent"`
	UnusedAreaM2       float64 `json:"unusedAreaM2"`
	IsUsed             bool    `json:"isUsed"`
}

type RawMaterialBatchOptimizerPlanLayoutDemandSummary struct {
	DemandLineID       string   `json:"demandLineId"`
	AllocatedSets      int      `json:"allocatedSets"`
	AllocatedPieces    int      `json:"allocatedPieces"`
	RollCount          int      `json:"rollCount"`
	RemainingSets      int      `json:"remainingSets"`
	RemainingPieces    int      `json:"remainingPieces"`
	RequiredSets       int      `json:"requiredSets"`
	RequiredPieces     int      `json:"requiredPieces"`
	Fulfilled          bool     `json:"fulfilled"`
	MustFulfill        bool     `json:"mustFulfill"`
	IsSplitAcrossRolls bool     `json:"isSplitAcrossRolls"`
	CoveragePercent    float64  `json:"coveragePercent"`
	UsageType          string   `json:"usageType"`
	Priority           int      `json:"priority"`
	RollIDs            []string `json:"rollIds"`
	ZoneIDs            []string `json:"zoneIds"`
}

type RawMaterialBatchOptimizerPlanLayoutZone struct {
	ID                   string   `json:"id"`
	Kind                 string   `json:"kind"`
	UsageCategory        string   `json:"usageCategory"`
	Label                string   `json:"label"`
	Detail               string   `json:"detail"`
	RollID               string   `json:"rollId,omitempty"`
	DemandLineID         string   `json:"demandLineId,omitempty"`
	AreaM2               float64  `json:"areaM2"`
	AllocatedSets        int      `json:"allocatedSets"`
	AllocatedPieces      int      `json:"allocatedPieces"`
	CoverageSharePercent float64  `json:"coverageSharePercent"`
	TooltipLines         []string `json:"tooltipLines"`
	X                    float64  `json:"x"`
	Y                    float64  `json:"y"`
	Width                float64  `json:"width"`
	Height               float64  `json:"height"`
}

type RawMaterialBatchOptimizerGeometryPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type RawMaterialBatchOptimizerGeometryLayoutZone struct {
	ID                   string                                   `json:"id"`
	Kind                 string                                   `json:"kind"`
	UsageCategory        string                                   `json:"usageCategory"`
	Label                string                                   `json:"label"`
	Detail               string                                   `json:"detail"`
	RollID               string                                   `json:"rollId,omitempty"`
	DemandLineID         string                                   `json:"demandLineId,omitempty"`
	AreaM2               float64                                  `json:"areaM2"`
	AllocatedSets        int                                      `json:"allocatedSets"`
	AllocatedPieces      int                                      `json:"allocatedPieces"`
	CoverageSharePercent float64                                  `json:"coverageSharePercent"`
	TooltipLines         []string                                 `json:"tooltipLines"`
	PolygonPoints        []RawMaterialBatchOptimizerGeometryPoint `json:"polygonPoints"`
}

type RawMaterialBatchOptimizerGeometryLayoutSummary struct {
	CanvasWidthMM  float64                                       `json:"canvasWidthMm"`
	CanvasHeightMM float64                                       `json:"canvasHeightMm"`
	Zones          []RawMaterialBatchOptimizerGeometryLayoutZone `json:"zones"`
}

type RawMaterialBatchOptimizerPlanLayoutSummary struct {
	CanvasWidthMM              float64                                            `json:"canvasWidthMm"`
	CanvasHeightMM             float64                                            `json:"canvasHeightMm"`
	RollCount                  int                                                `json:"rollCount"`
	AssignmentCount            int                                                `json:"assignmentCount"`
	FulfilledDemandLineCount   int                                                `json:"fulfilledDemandLineCount"`
	UnfulfilledDemandLineCount int                                                `json:"unfulfilledDemandLineCount"`
	Rolls                      []RawMaterialBatchOptimizerPlanLayoutRollSummary   `json:"rolls"`
	DemandLines                []RawMaterialBatchOptimizerPlanLayoutDemandSummary `json:"demandLines"`
	Zones                      []RawMaterialBatchOptimizerPlanLayoutZone          `json:"zones"`
}

type RawMaterialBatchOptimizerPlanLossBreakdown struct {
	UnusedRollAreaM2  float64 `json:"unusedRollAreaM2"`
	UnfulfilledAreaM2 float64 `json:"unfulfilledAreaM2"`
	TrimLossAreaM2    float64 `json:"trimLossAreaM2"`
	Message           string  `json:"message"`
}

type RawMaterialBatchOptimizerPlanComparisonSummary struct {
	FulfilledDemandCount int     `json:"fulfilledDemandCount"`
	MustFulfillSatisfied bool    `json:"mustFulfillSatisfied"`
	SplitDemandCount     int     `json:"splitDemandCount"`
	UsedRollCount        int     `json:"usedRollCount"`
	UsedRollPercent      float64 `json:"usedRollPercent"`
	UnusedRollAreaM2     float64 `json:"unusedRollAreaM2"`
	UnfulfilledAreaM2    float64 `json:"unfulfilledAreaM2"`
	TrimLossAreaM2       float64 `json:"trimLossAreaM2"`
}

type RawMaterialBatchOptimizerPlanScoreBreakdown struct {
	ObjectivePreset         string                                `json:"objectivePreset"`
	AppliedWeights          RawMaterialBatchOptimizerScoreWeights `json:"appliedWeights"`
	FulfilledRatePercent    float64                               `json:"fulfilledRatePercent"`
	FulfilledContribution   float64                               `json:"fulfilledContribution"`
	UtilizationContribution float64                               `json:"utilizationContribution"`
	StabilityContribution   float64                               `json:"stabilityContribution"`
	AssignmentPenalty       float64                               `json:"assignmentPenalty"`
	UnfulfilledPenalty      float64                               `json:"unfulfilledPenalty"`
	SplitPenalty            float64                               `json:"splitPenalty"`
	MustFulfillPenalty      float64                               `json:"mustFulfillPenalty"`
	GroupSplitCount         int                                   `json:"groupSplitCount"`
	SequenceViolationCount  int                                   `json:"sequenceViolationCount"`
	AdjacencyBreakCount     int                                   `json:"adjacencyBreakCount"`
	DirectionSwitchCount    int                                   `json:"directionSwitchCount"`
	MixViolationCount       int                                   `json:"mixViolationCount"`
	RollSwitchCount         int                                   `json:"rollSwitchCount"`
	GeometryReuseHitCount   int                                   `json:"geometryReuseHitCount"`
	ReusableResidualAreaM2  float64                               `json:"reusableResidualAreaM2"`
	FinalScore              float64                               `json:"finalScore"`
}

type RawMaterialBatchOptimizerMustFulfillDiagnostic struct {
	DemandLineID           string `json:"demandLineId"`
	Status                 string `json:"status"`
	ReasonCode             string `json:"reasonCode"`
	Message                string `json:"message"`
	BlockingConstraintCode string `json:"blockingConstraintCode"`
	BlockingConstraint     string `json:"blockingConstraint"`
	Suggestion             string `json:"suggestion"`
}

type RawMaterialBatchOptimizerPlanDiffSummary struct {
	BaselinePlanRank     int      `json:"baselinePlanRank"`
	BaselineStrategyKey  string   `json:"baselineStrategyKey"`
	Mode                 string   `json:"mode"`
	AddedZoneIDs         []string `json:"addedZoneIds"`
	RemovedZoneIDs       []string `json:"removedZoneIds"`
	ChangedDemandLineIDs []string `json:"changedDemandLineIds"`
	ChangedRollIDs       []string `json:"changedRollIds"`
	HighlightZoneIDs     []string `json:"highlightZoneIds"`
}

type RawMaterialBatchOptimizerSearchConfigSummary struct {
	PresetKey               string  `json:"presetKey"`
	BeamWidth               int     `json:"beamWidth"`
	MaxSearchDepth          int     `json:"maxSearchDepth"`
	PerDemandBranchingLimit int     `json:"perDemandBranchingLimit"`
	ResidualReuseBias       int     `json:"residualReuseBias"`
	ConvergenceAreaBucketM2 float64 `json:"convergenceAreaBucketM2"`
}

type RawMaterialBatchOptimizerContinuitySegment struct {
	Kind                    string   `json:"kind"`
	Key                     string   `json:"key"`
	RollID                  string   `json:"rollId,omitempty"`
	DemandLineIDs           []string `json:"demandLineIds"`
	Preserved               bool     `json:"preserved"`
	Reason                  string   `json:"reason"`
	BreakPosition           int      `json:"breakPosition,omitempty"`
	BreakBeforeDemandLineID string   `json:"breakBeforeDemandLineId,omitempty"`
	BreakAfterDemandLineID  string   `json:"breakAfterDemandLineId,omitempty"`
	AttributedZoneIDs       []string `json:"attributedZoneIds"`
}

type RawMaterialBatchOptimizerHeatZoneAttribution struct {
	ZoneID        string   `json:"zoneId"`
	SegmentKind   string   `json:"segmentKind"`
	SegmentKey    string   `json:"segmentKey"`
	Reason        string   `json:"reason"`
	RollID        string   `json:"rollId,omitempty"`
	DemandLineIDs []string `json:"demandLineIds"`
	ClusterID     string   `json:"clusterId,omitempty"`
	BreakSliceIDs []string `json:"breakSliceIds"`
}

type RawMaterialBatchOptimizerBreakSliceSummary struct {
	ID                      string   `json:"id"`
	SegmentKind             string   `json:"segmentKind"`
	SegmentKey              string   `json:"segmentKey"`
	RollID                  string   `json:"rollId,omitempty"`
	BreakPosition           int      `json:"breakPosition"`
	BreakBeforeDemandLineID string   `json:"breakBeforeDemandLineId,omitempty"`
	BreakAfterDemandLineID  string   `json:"breakAfterDemandLineId,omitempty"`
	ZoneIDs                 []string `json:"zoneIds"`
	ClusterID               string   `json:"clusterId,omitempty"`
	Reason                  string   `json:"reason"`
	SeverityScore           float64  `json:"severityScore"`
}

type RawMaterialBatchOptimizerZoneClusterSummary struct {
	ClusterID            string   `json:"clusterId"`
	ZoneIDs              []string `json:"zoneIds"`
	RollIDs              []string `json:"rollIds"`
	DemandLineIDs        []string `json:"demandLineIds"`
	BreakSliceIDs        []string `json:"breakSliceIds"`
	DominantReason       string   `json:"dominantReason"`
	DominantDemandLineID string   `json:"dominantDemandLineId,omitempty"`
	DensityScore         float64  `json:"densityScore"`
}

type RawMaterialBatchOptimizerStrategyBudgetStat struct {
	StrategyKey string `json:"strategyKey"`
	InputCount  int    `json:"inputCount"`
	KeptCount   int    `json:"keptCount"`
}

type RawMaterialBatchOptimizerDynamicStrategyBudgetStat struct {
	StrategyKey   string  `json:"strategyKey"`
	InputCount    int     `json:"inputCount"`
	TargetQuota   int     `json:"targetQuota"`
	KeptCount     int     `json:"keptCount"`
	PriorityScore float64 `json:"priorityScore"`
	RerankReason  string  `json:"rerankReason"`
}

type RawMaterialBatchOptimizerCandidateBudgetSummary struct {
	PerStrategyQuota     int                                                  `json:"perStrategyQuota"`
	GlobalBudget         int                                                  `json:"globalBudget"`
	MergedCandidateCount int                                                  `json:"mergedCandidateCount"`
	StrategyStats        []RawMaterialBatchOptimizerStrategyBudgetStat        `json:"strategyStats"`
	DynamicStrategyStats []RawMaterialBatchOptimizerDynamicStrategyBudgetStat `json:"dynamicStrategyStats"`
}

type RawMaterialBatchOptimizerPlanExplainabilitySummary struct {
	GroupSegments        []RawMaterialBatchOptimizerContinuitySegment   `json:"groupSegments"`
	SequenceSegments     []RawMaterialBatchOptimizerContinuitySegment   `json:"sequenceSegments"`
	AdjacencySegments    []RawMaterialBatchOptimizerContinuitySegment   `json:"adjacencySegments"`
	PrimaryBreakReasons  []string                                       `json:"primaryBreakReasons"`
	HeatZoneAttributions []RawMaterialBatchOptimizerHeatZoneAttribution `json:"heatZoneAttributions"`
	BreakSlices          []RawMaterialBatchOptimizerBreakSliceSummary   `json:"breakSlices"`
	ZoneClusters         []RawMaterialBatchOptimizerZoneClusterSummary  `json:"zoneClusters"`
}

type RawMaterialBatchOptimizerPlanReportSummary struct {
	PlanRank               int                                                `json:"planRank"`
	StrategyKey            string                                             `json:"strategyKey"`
	ObjectivePreset        string                                             `json:"objectivePreset"`
	AppliedWeights         RawMaterialBatchOptimizerScoreWeights              `json:"appliedWeights"`
	BaselinePlanRank       int                                                `json:"baselinePlanRank"`
	BaselineStrategyKey    string                                             `json:"baselineStrategyKey"`
	Score                  float64                                            `json:"score"`
	UtilizationPercent     float64                                            `json:"utilizationPercent"`
	LossAreaM2             float64                                            `json:"lossAreaM2"`
	MustFulfillRiskCount   int                                                `json:"mustFulfillRiskCount"`
	ChangedDemandLineCount int                                                `json:"changedDemandLineCount"`
	ChangedRollCount       int                                                `json:"changedRollCount"`
	HighlightZoneCount     int                                                `json:"highlightZoneCount"`
	AdjacencyBreakCount    int                                                `json:"adjacencyBreakCount"`
	RollSwitchCount        int                                                `json:"rollSwitchCount"`
	GeometryReuseHitCount  int                                                `json:"geometryReuseHitCount"`
	ReusableResidualAreaM2 float64                                            `json:"reusableResidualAreaM2"`
	SearchConfig           RawMaterialBatchOptimizerSearchConfigSummary       `json:"searchConfig"`
	CandidateBudgetSummary RawMaterialBatchOptimizerCandidateBudgetSummary    `json:"candidateBudgetSummary"`
	BudgetRerankReason     string                                             `json:"budgetRerankReason"`
	ExplainabilitySummary  RawMaterialBatchOptimizerPlanExplainabilitySummary `json:"explainabilitySummary"`
	ComparisonSummary      RawMaterialBatchOptimizerPlanComparisonSummary     `json:"comparisonSummary"`
	ScoreBreakdown         RawMaterialBatchOptimizerPlanScoreBreakdown        `json:"scoreBreakdown"`
}

type RawMaterialBatchOptimizerPlan struct {
	Rank                   int                                                `json:"rank"`
	StrategyKey            string                                             `json:"strategyKey"`
	Score                  float64                                            `json:"score"`
	UtilizationPercent     float64                                            `json:"utilizationPercent"`
	LossAreaM2             float64                                            `json:"lossAreaM2"`
	Explanation            string                                             `json:"explanation"`
	Assignments            []RawMaterialBatchOptimizerPlanAssignment          `json:"assignments"`
	UnfulfilledLines       []RawMaterialBatchOptimizerUnfulfilledLine         `json:"unfulfilledLines"`
	LayoutSummary          RawMaterialBatchOptimizerPlanLayoutSummary         `json:"layoutSummary"`
	GeometryLayoutSummary  *RawMaterialBatchOptimizerGeometryLayoutSummary    `json:"geometryLayoutSummary,omitempty"`
	LossBreakdown          RawMaterialBatchOptimizerPlanLossBreakdown         `json:"lossBreakdown"`
	ComparisonSummary      RawMaterialBatchOptimizerPlanComparisonSummary     `json:"comparisonSummary"`
	ScoreBreakdown         RawMaterialBatchOptimizerPlanScoreBreakdown        `json:"scoreBreakdown"`
	MustFulfillDiagnostics []RawMaterialBatchOptimizerMustFulfillDiagnostic   `json:"mustFulfillDiagnostics"`
	DiffSummary            RawMaterialBatchOptimizerPlanDiffSummary           `json:"diffSummary"`
	DiffSummaries          []RawMaterialBatchOptimizerPlanDiffSummary         `json:"diffSummaries"`
	SearchConfig           RawMaterialBatchOptimizerSearchConfigSummary       `json:"searchConfig"`
	CandidateBudgetSummary RawMaterialBatchOptimizerCandidateBudgetSummary    `json:"candidateBudgetSummary"`
	BudgetRerankReason     string                                             `json:"budgetRerankReason"`
	ExplainabilitySummary  RawMaterialBatchOptimizerPlanExplainabilitySummary `json:"explainabilitySummary"`
	ReportSummary          RawMaterialBatchOptimizerPlanReportSummary         `json:"reportSummary"`
}

type RawMaterialBatchOptimizerSolveSummary struct {
	SolverStatus string `json:"solverStatus"`
	Message      string `json:"message"`
	PlanCount    int    `json:"planCount"`
}

type RawMaterialBatchOptimizerSolveResponse struct {
	RequestID string                                `json:"requestId"`
	Summary   RawMaterialBatchOptimizerSolveSummary `json:"summary"`
	Plans     []RawMaterialBatchOptimizerPlan       `json:"plans"`
}

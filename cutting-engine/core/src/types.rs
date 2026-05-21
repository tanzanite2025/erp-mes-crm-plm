#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CuttingAngleMixMode {
    Allow,
    PreferSameAngle,
    StrictSameAngle,
}

#[derive(Clone, Copy, Debug)]
pub struct CuttingEngineWeights {
    pub split_penalty: f64,
    pub must_fulfill_penalty_weight: f64,
}

#[derive(Clone, Copy, Debug)]
pub struct CuttingEngineDirectionRules {
    pub angle_mix_mode: CuttingAngleMixMode,
    pub same_direction_preferred: bool,
    pub direction_switch_penalty_weight: f64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CuttingMustFulfillMode {
    Strict,
    SoftPenalty,
    Ignore,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CuttingMixingStrategy {
    Allow,
    SameGroupOnly,
    StrictNoMix,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CuttingOrderStrategy {
    RespectOrder,
    SoftPenalty,
    Ignore,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CuttingDirectionStrategy {
    SameDirectionPreferred,
    SameDirectionRequired,
    AllowSwitch,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CuttingEngineRuleStrategy {
    pub must_fulfill_mode: CuttingMustFulfillMode,
    pub mixing_strategy: CuttingMixingStrategy,
    pub order_strategy: CuttingOrderStrategy,
    pub direction_strategy: CuttingDirectionStrategy,
}

#[derive(Clone, Debug)]
pub struct CuttingUnitInput {
    pub id: String,
    pub label: String,
    pub width_mm: f64,
    pub length_mm: f64,
    pub quantity: u32,
    pub cut_angle_deg: f64,
    pub priority: f64,
    pub must_fulfill: bool,
    pub allow_mixed_plan: bool,
    pub roll_group_key: String,
    pub order_sequence: i32,
    pub yarn_direction_mode: String,
    pub process_tags: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct CuttingEngineInput {
    pub roll_width_mm: f64,
    pub roll_length_mm: f64,
    pub knife_gap_mm: f64,
    pub edge_trim_mm: f64,
    pub min_supported_length_mm: f64,
    pub max_supported_length_mm: f64,
    pub fixed_decision_length_mm: Option<f64>,
    pub weights: CuttingEngineWeights,
    pub direction_rules: CuttingEngineDirectionRules,
    pub rule_strategy: CuttingEngineRuleStrategy,
    pub cut_units: Vec<CuttingUnitInput>,
    pub max_candidate_plans: usize,
    pub max_solve_duration_seconds: Option<f64>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CuttingZoneKind {
    Roll,
    Material,
    Loss,
}

#[derive(Clone, Debug)]
pub struct CuttingLayoutZone {
    pub id: String,
    pub kind: CuttingZoneKind,
    pub x_mm: f64,
    pub y_mm: f64,
    pub width_mm: f64,
    pub height_mm: f64,
    pub label: String,
}

#[derive(Clone, Debug)]
pub struct CuttingPlanRuleDiagnostics {
    pub priority: f64,
    pub must_fulfill: bool,
    pub allow_mixed_plan: bool,
    pub roll_group_key: String,
    pub order_sequence: i32,
    pub process_tags: Vec<String>,
    pub must_fulfill_count: u32,
    pub mixed_plan_restricted_count: u32,
    pub roll_group_count: u32,
    pub process_tag_count: u32,
    pub priority_sum: f64,
    pub sequence_span: u32,
}

impl CuttingPlanRuleDiagnostics {
    pub(crate) fn has_contract_rules(&self) -> bool {
        self.must_fulfill_count > 0
            || self.mixed_plan_restricted_count > 0
            || self.roll_group_count > 0
            || self.process_tag_count > 0
            || self.priority_sum > 0.0
            || self.sequence_span > 0
    }
}

#[derive(Clone, Debug)]
pub struct CuttingPlan {
    pub plan_id: String,
    pub score: f64,
    pub decision_length_mm: f64,
    pub utilization_percent: f64,
    pub loss_area_m2: f64,
    pub produced_pieces: u32,
    pub direction_switch_count: u32,
    pub angle_mix_violation_count: u32,
    pub must_fulfill_satisfied: bool,
    pub must_fulfill_penalty: f64,
    pub rule_diagnostics: CuttingPlanRuleDiagnostics,
    pub zones: Vec<CuttingLayoutZone>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct CuttingEngineOutput {
    pub plans: Vec<CuttingPlan>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CuttingEngineError {
    InvalidRollWidth,
    InvalidRollLength,
    InvalidKnifeGap,
    InvalidEdgeTrim,
    InvalidUsableArea,
    InvalidLengthBoundary,
    FixedDecisionLengthOutOfRange,
    InvalidWeight,
    EmptyCutUnits,
    InvalidCutUnit(String),
}

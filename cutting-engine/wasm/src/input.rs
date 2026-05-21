use serde::Deserialize;
use xdfc_cutting_engine_core::{
    CuttingAngleMixMode, CuttingDirectionStrategy, CuttingEngineDirectionRules, CuttingEngineInput,
    CuttingEngineRuleStrategy, CuttingEngineWeights, CuttingMixingStrategy, CuttingMustFulfillMode,
    CuttingObjectivePreset, CuttingOrderStrategy, CuttingUnitInput,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WasmCuttingEngineInput {
    roll_width_mm: f64,
    roll_length_mm: f64,
    knife_gap_mm: f64,
    edge_trim_mm: f64,
    min_supported_length_mm: f64,
    max_supported_length_mm: f64,
    fixed_decision_length_mm: Option<f64>,
    objective_preset: String,
    weights: WasmCuttingEngineWeights,
    direction_rules: WasmCuttingEngineDirectionRules,
    #[serde(default = "default_rule_strategy")]
    rule_strategy: WasmCuttingEngineRuleStrategy,
    cut_units: Vec<WasmCuttingUnitInput>,
    max_candidate_plans: usize,
    #[serde(default)]
    max_solve_duration_seconds: Option<f64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WasmCuttingEngineWeights {
    utilization_weight: f64,
    stability_weight: f64,
    split_penalty: f64,
    #[serde(default = "default_must_fulfill_penalty_weight")]
    must_fulfill_penalty_weight: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WasmCuttingEngineDirectionRules {
    angle_mix_mode: String,
    same_direction_preferred: bool,
    direction_switch_penalty_weight: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WasmCuttingEngineRuleStrategy {
    must_fulfill_mode: String,
    mixing_strategy: String,
    order_strategy: String,
    direction_strategy: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WasmCuttingUnitInput {
    id: String,
    label: String,
    width_mm: f64,
    length_mm: f64,
    quantity: u32,
    cut_angle_deg: f64,
    #[serde(default)]
    priority: f64,
    #[serde(default)]
    must_fulfill: bool,
    #[serde(default = "default_allow_mixed_plan")]
    allow_mixed_plan: bool,
    #[serde(default)]
    roll_group_key: String,
    #[serde(default)]
    order_sequence: i32,
    yarn_direction_mode: String,
    #[serde(default)]
    process_tags: Vec<String>,
}

pub(crate) fn to_core_input(input: WasmCuttingEngineInput) -> Result<CuttingEngineInput, String> {
    Ok(CuttingEngineInput {
        roll_width_mm: input.roll_width_mm,
        roll_length_mm: input.roll_length_mm,
        knife_gap_mm: input.knife_gap_mm,
        edge_trim_mm: input.edge_trim_mm,
        min_supported_length_mm: input.min_supported_length_mm,
        max_supported_length_mm: input.max_supported_length_mm,
        fixed_decision_length_mm: input.fixed_decision_length_mm,
        objective_preset: parse_objective(&input.objective_preset)?,
        weights: CuttingEngineWeights {
            utilization_weight: input.weights.utilization_weight,
            stability_weight: input.weights.stability_weight,
            split_penalty: input.weights.split_penalty,
            must_fulfill_penalty_weight: input.weights.must_fulfill_penalty_weight,
        },
        direction_rules: CuttingEngineDirectionRules {
            angle_mix_mode: parse_angle_mix_mode(&input.direction_rules.angle_mix_mode)?,
            same_direction_preferred: input.direction_rules.same_direction_preferred,
            direction_switch_penalty_weight: input.direction_rules.direction_switch_penalty_weight,
        },
        rule_strategy: CuttingEngineRuleStrategy {
            must_fulfill_mode: parse_must_fulfill_mode(&input.rule_strategy.must_fulfill_mode)?,
            mixing_strategy: parse_mixing_strategy(&input.rule_strategy.mixing_strategy)?,
            order_strategy: parse_order_strategy(&input.rule_strategy.order_strategy)?,
            direction_strategy: parse_direction_strategy(&input.rule_strategy.direction_strategy)?,
        },
        cut_units: input
            .cut_units
            .into_iter()
            .map(|unit| CuttingUnitInput {
                id: unit.id,
                label: unit.label,
                width_mm: unit.width_mm,
                length_mm: unit.length_mm,
                quantity: unit.quantity,
                cut_angle_deg: unit.cut_angle_deg,
                priority: unit.priority,
                must_fulfill: unit.must_fulfill,
                allow_mixed_plan: unit.allow_mixed_plan,
                roll_group_key: unit.roll_group_key,
                order_sequence: unit.order_sequence,
                yarn_direction_mode: unit.yarn_direction_mode,
                process_tags: unit.process_tags,
            })
            .collect(),
        max_candidate_plans: input.max_candidate_plans,
        max_solve_duration_seconds: normalize_positive_optional(input.max_solve_duration_seconds),
    })
}

fn normalize_positive_optional(value: Option<f64>) -> Option<f64> {
    value.filter(|item| item.is_finite() && *item > 0.0)
}

fn parse_objective(value: &str) -> Result<CuttingObjectivePreset, String> {
    match value {
        "yield-first" => Ok(CuttingObjectivePreset::YieldFirst),
        "stability-first" => Ok(CuttingObjectivePreset::StabilityFirst),
        _ => Err(format!("unsupported objective preset: {value}")),
    }
}

fn parse_angle_mix_mode(value: &str) -> Result<CuttingAngleMixMode, String> {
    match value {
        "allow" => Ok(CuttingAngleMixMode::Allow),
        "prefer-same-angle" => Ok(CuttingAngleMixMode::PreferSameAngle),
        "strict-same-angle" => Ok(CuttingAngleMixMode::StrictSameAngle),
        _ => Err(format!("unsupported angle mix mode: {value}")),
    }
}

fn parse_must_fulfill_mode(value: &str) -> Result<CuttingMustFulfillMode, String> {
    match value {
        "strict" => Ok(CuttingMustFulfillMode::Strict),
        "soft-penalty" => Ok(CuttingMustFulfillMode::SoftPenalty),
        "ignore" => Ok(CuttingMustFulfillMode::Ignore),
        _ => Err(format!("unsupported must fulfill mode: {value}")),
    }
}

fn parse_mixing_strategy(value: &str) -> Result<CuttingMixingStrategy, String> {
    match value {
        "allow" => Ok(CuttingMixingStrategy::Allow),
        "sameGroupOnly" => Ok(CuttingMixingStrategy::SameGroupOnly),
        "strictNoMix" => Ok(CuttingMixingStrategy::StrictNoMix),
        _ => Err(format!("unsupported mixing strategy: {value}")),
    }
}

fn parse_order_strategy(value: &str) -> Result<CuttingOrderStrategy, String> {
    match value {
        "respectOrder" => Ok(CuttingOrderStrategy::RespectOrder),
        "softPenalty" => Ok(CuttingOrderStrategy::SoftPenalty),
        "ignore" => Ok(CuttingOrderStrategy::Ignore),
        _ => Err(format!("unsupported order strategy: {value}")),
    }
}

fn parse_direction_strategy(value: &str) -> Result<CuttingDirectionStrategy, String> {
    match value {
        "sameDirectionPreferred" => Ok(CuttingDirectionStrategy::SameDirectionPreferred),
        "sameDirectionRequired" => Ok(CuttingDirectionStrategy::SameDirectionRequired),
        "allowSwitch" => Ok(CuttingDirectionStrategy::AllowSwitch),
        _ => Err(format!("unsupported direction strategy: {value}")),
    }
}

fn default_rule_strategy() -> WasmCuttingEngineRuleStrategy {
    WasmCuttingEngineRuleStrategy {
        must_fulfill_mode: "soft-penalty".to_string(),
        mixing_strategy: "sameGroupOnly".to_string(),
        order_strategy: "softPenalty".to_string(),
        direction_strategy: "sameDirectionPreferred".to_string(),
    }
}

fn default_allow_mixed_plan() -> bool {
    true
}

fn default_must_fulfill_penalty_weight() -> f64 {
    6000.0
}

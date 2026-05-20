use crate::geometry::round3;
use crate::{
    CuttingAngleMixMode, CuttingEngineInput, CuttingPlanRuleDiagnostics, CuttingUnitInput,
};

fn normalized_direction_key(unit: &CuttingUnitInput) -> String {
    let direction = unit.yarn_direction_mode.trim();
    if direction.is_empty() {
        format!("angle:{:.3}", unit.cut_angle_deg)
    } else {
        format!(
            "{}|angle:{:.3}",
            direction.to_lowercase(),
            unit.cut_angle_deg
        )
    }
}

pub(crate) fn count_direction_switches(units: &[CuttingUnitInput]) -> u32 {
    units
        .windows(2)
        .filter(|pair| normalized_direction_key(&pair[0]) != normalized_direction_key(&pair[1]))
        .count() as u32
}

pub(crate) fn count_angle_mix_violations(input: &CuttingEngineInput) -> u32 {
    if input.direction_rules.angle_mix_mode == CuttingAngleMixMode::Allow {
        return 0;
    }

    let mut unique_angles: Vec<f64> = Vec::new();
    for unit in &input.cut_units {
        if !unique_angles
            .iter()
            .any(|angle| (angle - unit.cut_angle_deg).abs() < 0.001)
        {
            unique_angles.push(unit.cut_angle_deg);
        }
    }

    unique_angles.len().saturating_sub(1) as u32
}

fn unique_count(values: impl Iterator<Item = String>) -> u32 {
    let mut unique_values: Vec<String> = Vec::new();
    for value in values {
        let normalized = value.trim().to_lowercase();
        if !normalized.is_empty() && !unique_values.iter().any(|item| item == &normalized) {
            unique_values.push(normalized);
        }
    }
    unique_values.len() as u32
}

pub(crate) fn summarize_input_rule_diagnostics(
    input: &CuttingEngineInput,
) -> CuttingPlanRuleDiagnostics {
    let must_fulfill_count = input
        .cut_units
        .iter()
        .filter(|unit| unit.must_fulfill)
        .count() as u32;
    let mixed_plan_restricted_count = input
        .cut_units
        .iter()
        .filter(|unit| !unit.allow_mixed_plan)
        .count() as u32;
    let roll_group_count = unique_count(
        input
            .cut_units
            .iter()
            .map(|unit| unit.roll_group_key.clone()),
    );
    let process_tag_count = unique_count(
        input
            .cut_units
            .iter()
            .flat_map(|unit| unit.process_tags.iter().cloned()),
    );
    let priority_sum = round3(
        input
            .cut_units
            .iter()
            .map(|unit| unit.priority)
            .sum::<f64>(),
    );
    let min_sequence = input
        .cut_units
        .iter()
        .map(|unit| unit.order_sequence)
        .min()
        .unwrap_or(0);
    let max_sequence = input
        .cut_units
        .iter()
        .map(|unit| unit.order_sequence)
        .max()
        .unwrap_or(0);
    let sequence_span = i64::from(max_sequence)
        .saturating_sub(i64::from(min_sequence))
        .min(i64::from(u32::MAX)) as u32;

    CuttingPlanRuleDiagnostics {
        priority: 0.0,
        must_fulfill: must_fulfill_count > 0,
        allow_mixed_plan: mixed_plan_restricted_count == 0,
        roll_group_key: String::new(),
        order_sequence: min_sequence,
        process_tags: Vec::new(),
        must_fulfill_count,
        mixed_plan_restricted_count,
        roll_group_count,
        process_tag_count,
        priority_sum,
        sequence_span,
    }
}

pub(crate) fn build_plan_rule_diagnostics(
    input_diagnostics: &CuttingPlanRuleDiagnostics,
    unit: &CuttingUnitInput,
) -> CuttingPlanRuleDiagnostics {
    CuttingPlanRuleDiagnostics {
        priority: round3(unit.priority),
        must_fulfill: unit.must_fulfill,
        allow_mixed_plan: unit.allow_mixed_plan,
        roll_group_key: unit.roll_group_key.trim().to_string(),
        order_sequence: unit.order_sequence,
        process_tags: unit
            .process_tags
            .iter()
            .map(|tag| tag.trim().to_string())
            .filter(|tag| !tag.is_empty())
            .collect(),
        must_fulfill_count: input_diagnostics.must_fulfill_count,
        mixed_plan_restricted_count: input_diagnostics.mixed_plan_restricted_count,
        roll_group_count: input_diagnostics.roll_group_count,
        process_tag_count: input_diagnostics.process_tag_count,
        priority_sum: input_diagnostics.priority_sum,
        sequence_span: input_diagnostics.sequence_span,
    }
}

pub(crate) fn resolve_plan_direction_switch_count(
    input: &CuttingEngineInput,
    unit: &CuttingUnitInput,
) -> u32 {
    if !input.direction_rules.same_direction_preferred {
        return 0;
    }

    let unit_key = normalized_direction_key(unit);
    input
        .cut_units
        .iter()
        .filter(|candidate| normalized_direction_key(candidate) != unit_key)
        .count() as u32
}

pub(crate) fn resolve_plan_angle_mix_violation_count(
    input: &CuttingEngineInput,
    unit: &CuttingUnitInput,
) -> u32 {
    if input.direction_rules.angle_mix_mode == CuttingAngleMixMode::Allow {
        return 0;
    }

    input
        .cut_units
        .iter()
        .filter(|candidate| (candidate.cut_angle_deg - unit.cut_angle_deg).abs() >= 0.001)
        .count() as u32
}

pub(crate) fn build_plan_warnings(
    input: &CuttingEngineInput,
    unit: &CuttingUnitInput,
    direction_switch_count: u32,
    angle_mix_violation_count: u32,
) -> Vec<String> {
    let mut warnings = Vec::new();
    if direction_switch_count > 0 {
        warnings.push(format!(
            "{} has {} direction switch candidate(s)",
            unit.id, direction_switch_count
        ));
    }
    if input.direction_rules.angle_mix_mode == CuttingAngleMixMode::StrictSameAngle
        && angle_mix_violation_count > 0
    {
        warnings.push(format!(
            "{} violates strict same-angle policy against {} candidate(s)",
            unit.id, angle_mix_violation_count
        ));
    }
    warnings
}

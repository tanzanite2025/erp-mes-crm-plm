use std::cmp::Ordering;

use crate::geometry::{fit_count, resolve_decision_length, round3};
use crate::rules::summarize_input_rule_diagnostics;
use crate::{
    CuttingAngleMixMode, CuttingDirectionStrategy, CuttingEngineError, CuttingEngineInput,
    CuttingLayoutZone, CuttingMixingStrategy, CuttingMustFulfillMode, CuttingOrderStrategy,
    CuttingPlan, CuttingPlanRuleDiagnostics, CuttingUnitInput, CuttingZoneKind,
};

#[derive(Clone, Debug)]
struct PackedUnit {
    unit_index: usize,
    decision_length_mm: f64,
    produced_pieces: u32,
}

pub(crate) fn try_build_combined_plan<F>(
    input: &CuttingEngineInput,
    elapsed_seconds: &mut F,
) -> Result<Option<(CuttingPlan, Vec<String>)>, CuttingEngineError>
where
    F: FnMut() -> f64,
{
    if input.cut_units.len() < 2 {
        return Ok(None);
    }

    let usable_width_mm = input.roll_width_mm - input.edge_trim_mm * 2.0;
    let usable_length_mm = input.roll_length_mm - input.edge_trim_mm * 2.0;
    let mut cursor_x_mm = input.edge_trim_mm;
    let mut zones = vec![CuttingLayoutZone {
        id: "roll".to_string(),
        kind: CuttingZoneKind::Roll,
        x_mm: 0.0,
        y_mm: 0.0,
        width_mm: round3(input.roll_width_mm),
        height_mm: round3(input.roll_length_mm),
        label: "Roll".to_string(),
        unit_id: None,
        allocated_pieces: 0,
    }];
    let mut packed_units = Vec::new();
    let mut warnings = vec!["single-roll rectangular greedy packing".to_string()];
    let ordered_indices = order_unit_indices(input);
    let mut first_packed_index: Option<usize> = None;
    let mut last_packed_index: Option<usize> = None;
    let mut direction_switch_count = 0;
    let mut angle_mix_violation_count = 0;

    for unit_index in ordered_indices {
        if let Some(budget) = input.max_solve_duration_seconds {
            let elapsed = elapsed_seconds();
            if elapsed.is_finite() && elapsed >= budget {
                warnings.push(format!(
                    "solve time budget {:.3}s reached after {:.3}s; combined packing stopped after {} demand line(s)",
                    budget,
                    elapsed,
                    packed_units.len()
                ));
                break;
            }
        }

        let unit = &input.cut_units[unit_index];
        if let Some(first_index) = first_packed_index {
            if let Some(reason) = incompatibility_reason(input, &input.cut_units[first_index], unit)
            {
                warnings.push(format!(
                    "{} skipped from combined roll: {}",
                    unit.id, reason
                ));
                continue;
            }
        }

        let decision_length_mm = resolve_decision_length(input, unit)?;
        let pieces_per_strip = fit_count(usable_length_mm, decision_length_mm, input.knife_gap_mm);
        let used_width_mm = (cursor_x_mm - input.edge_trim_mm).max(0.0);
        let remaining_width_mm = (usable_width_mm - used_width_mm).max(0.0);
        let strips_available = fit_count(remaining_width_mm, unit.width_mm, input.knife_gap_mm);
        let capacity = pieces_per_strip.saturating_mul(strips_available);
        let produced_pieces = capacity.min(unit.quantity);

        if unit.must_fulfill
            && input.rule_strategy.must_fulfill_mode == CuttingMustFulfillMode::Strict
            && produced_pieces < unit.quantity
        {
            warnings.push(format!(
                "{} skipped because strict mustFulfill cannot be completed on the remaining roll width ({}/{} pieces)",
                unit.id, produced_pieces, unit.quantity
            ));
            continue;
        }

        if produced_pieces == 0 {
            warnings.push(format!(
                "{} cannot fit within the remaining combined roll area",
                unit.id
            ));
            continue;
        }

        let strips_needed = produced_pieces.saturating_add(pieces_per_strip.saturating_sub(1))
            / pieces_per_strip.max(1);
        let mut remaining_pieces = produced_pieces;

        for strip_index in 0..strips_needed {
            let strip_pieces = remaining_pieces.min(pieces_per_strip);
            let strip_height_mm = decision_length_mm * f64::from(strip_pieces)
                + input.knife_gap_mm * f64::from(strip_pieces.saturating_sub(1));
            let strip_x_mm =
                cursor_x_mm + f64::from(strip_index) * (unit.width_mm + input.knife_gap_mm);

            zones.push(CuttingLayoutZone {
                id: format!("material-{}-strip-{}", unit.id, strip_index + 1),
                kind: CuttingZoneKind::Material,
                x_mm: round3(strip_x_mm),
                y_mm: round3(input.edge_trim_mm),
                width_mm: round3(unit.width_mm),
                height_mm: round3(strip_height_mm),
                label: unit.label.clone(),
                unit_id: Some(unit.id.clone()),
                allocated_pieces: strip_pieces,
            });
            remaining_pieces = remaining_pieces.saturating_sub(strip_pieces);
        }

        cursor_x_mm += f64::from(strips_needed) * unit.width_mm
            + input.knife_gap_mm * f64::from(strips_needed.saturating_sub(1));

        if let Some(last_index) = last_packed_index {
            if normalized_direction_key(&input.cut_units[last_index])
                != normalized_direction_key(unit)
            {
                direction_switch_count += 1;
            }
            if (input.cut_units[last_index].cut_angle_deg - unit.cut_angle_deg).abs() >= 0.001
                && input.direction_rules.angle_mix_mode != CuttingAngleMixMode::Allow
            {
                angle_mix_violation_count += 1;
            }
        }

        first_packed_index.get_or_insert(unit_index);
        last_packed_index = Some(unit_index);
        packed_units.push(PackedUnit {
            unit_index,
            decision_length_mm,
            produced_pieces,
        });
    }

    if packed_units.is_empty() {
        return Ok(None);
    }

    let roll_area_m2 = (input.roll_width_mm * input.roll_length_mm) / 1_000_000.0;
    let used_area_m2 = packed_units
        .iter()
        .map(|packed| {
            let unit = &input.cut_units[packed.unit_index];
            unit.width_mm * packed.decision_length_mm * f64::from(packed.produced_pieces)
                / 1_000_000.0
        })
        .sum::<f64>();
    let utilization_percent = if roll_area_m2 > 0.0 {
        (used_area_m2 / roll_area_m2) * 100.0
    } else {
        0.0
    };
    let loss_area_m2 = round3((roll_area_m2 - used_area_m2).max(0.0));
    let must_fulfill_penalty = packed_units
        .iter()
        .map(|packed| {
            let unit = &input.cut_units[packed.unit_index];
            resolve_must_fulfill_penalty(input, unit, packed.produced_pieces)
        })
        .sum::<f64>();
    let must_fulfill_satisfied =
        input
            .cut_units
            .iter()
            .filter(|unit| unit.must_fulfill)
            .all(|unit| {
                packed_units
                    .iter()
                    .find(|packed| packed.unit_index == input_unit_index(input, unit))
                    .map(|packed| packed.produced_pieces >= unit.quantity)
                    .unwrap_or(false)
            });
    let direction_bonus = if input.direction_rules.same_direction_preferred {
        input.direction_rules.direction_switch_penalty_weight
    } else {
        0.0
    };
    let angle_mix_multiplier = match input.direction_rules.angle_mix_mode {
        CuttingAngleMixMode::Allow => 0.0,
        CuttingAngleMixMode::PreferSameAngle => 0.5,
        CuttingAngleMixMode::StrictSameAngle => 2.0,
    };
    let angle_mix_penalty = f64::from(angle_mix_violation_count)
        * input.direction_rules.direction_switch_penalty_weight
        * angle_mix_multiplier;
    let score =
        round3(utilization_percent + direction_bonus - loss_area_m2 * input.weights.split_penalty)
            - round3(
                f64::from(direction_switch_count)
                    * input.direction_rules.direction_switch_penalty_weight
                    + angle_mix_penalty
                    + must_fulfill_penalty,
            );

    if direction_switch_count > 0 {
        warnings.push(format!(
            "combined roll contains {} direction switch(es)",
            direction_switch_count
        ));
    }
    if angle_mix_violation_count > 0 {
        warnings.push(format!(
            "combined roll contains {} angle mix violation(s)",
            angle_mix_violation_count
        ));
    }
    if packed_units
        .iter()
        .any(|packed| input.cut_units[packed.unit_index].must_fulfill)
        && !must_fulfill_satisfied
    {
        warnings
            .push("combined roll does not fully satisfy every mustFulfill demand line".to_string());
    }

    let first_decision_length_mm = packed_units
        .first()
        .map(|packed| packed.decision_length_mm)
        .unwrap_or(0.0);
    let has_multiple_decision_lengths = packed_units
        .iter()
        .any(|packed| (packed.decision_length_mm - first_decision_length_mm).abs() >= 0.001);
    if has_multiple_decision_lengths {
        warnings
            .push("combined roll uses independent decision lengths per demand line".to_string());
    }

    let input_rule_diagnostics = summarize_input_rule_diagnostics(input);
    let rule_diagnostics = build_combined_rule_diagnostics(input, &packed_units);
    let plan = CuttingPlan {
        plan_id: "plan-single-roll-greedy".to_string(),
        score: round3(score),
        decision_length_mm: round3(first_decision_length_mm),
        utilization_percent: round3(utilization_percent),
        loss_area_m2,
        produced_pieces: packed_units
            .iter()
            .map(|packed| packed.produced_pieces)
            .sum(),
        direction_switch_count,
        angle_mix_violation_count,
        must_fulfill_satisfied,
        must_fulfill_penalty: round3(must_fulfill_penalty),
        rule_diagnostics: CuttingPlanRuleDiagnostics {
            must_fulfill_count: input_rule_diagnostics.must_fulfill_count,
            mixed_plan_restricted_count: input_rule_diagnostics.mixed_plan_restricted_count,
            roll_group_count: input_rule_diagnostics.roll_group_count,
            process_tag_count: input_rule_diagnostics.process_tag_count,
            priority_sum: input_rule_diagnostics.priority_sum,
            sequence_span: input_rule_diagnostics.sequence_span,
            ..rule_diagnostics
        },
        zones,
        warnings: warnings.clone(),
    };

    Ok(Some((plan, warnings)))
}

fn order_unit_indices(input: &CuttingEngineInput) -> Vec<usize> {
    let mut indices: Vec<usize> = (0..input.cut_units.len()).collect();
    indices.sort_by(|left_index, right_index| {
        let left = &input.cut_units[*left_index];
        let right = &input.cut_units[*right_index];
        let order = if input.rule_strategy.order_strategy == CuttingOrderStrategy::RespectOrder {
            normalized_order_sequence(left).cmp(&normalized_order_sequence(right))
        } else {
            Ordering::Equal
        };
        order
            .then_with(|| {
                right
                    .priority
                    .partial_cmp(&left.priority)
                    .unwrap_or(Ordering::Equal)
            })
            .then_with(|| left.id.cmp(&right.id))
    });
    indices
}

fn normalized_order_sequence(unit: &CuttingUnitInput) -> i32 {
    if unit.order_sequence > 0 {
        unit.order_sequence
    } else {
        i32::MAX
    }
}

fn normalized_group_key(unit: &CuttingUnitInput) -> String {
    unit.roll_group_key.trim().to_lowercase()
}

fn normalized_direction_key(unit: &CuttingUnitInput) -> String {
    let direction = unit.yarn_direction_mode.trim();
    if direction.is_empty() {
        "default".to_string()
    } else {
        direction.to_lowercase()
    }
}

fn incompatibility_reason(
    input: &CuttingEngineInput,
    first: &CuttingUnitInput,
    candidate: &CuttingUnitInput,
) -> Option<&'static str> {
    if input.rule_strategy.mixing_strategy == CuttingMixingStrategy::StrictNoMix {
        return Some("strictNoMix allows only one demand line per roll");
    }
    if !first.allow_mixed_plan || !candidate.allow_mixed_plan {
        return Some("allowMixedPlan=false rejects a mixed roll");
    }
    if input.rule_strategy.mixing_strategy == CuttingMixingStrategy::SameGroupOnly
        && normalized_group_key(first) != normalized_group_key(candidate)
    {
        return Some("sameGroupOnly requires the same roll group");
    }
    if input.rule_strategy.direction_strategy == CuttingDirectionStrategy::SameDirectionRequired
        && normalized_direction_key(first) != normalized_direction_key(candidate)
    {
        return Some("sameDirectionRequired rejects a direction change");
    }
    if input.direction_rules.angle_mix_mode == CuttingAngleMixMode::StrictSameAngle
        && (first.cut_angle_deg - candidate.cut_angle_deg).abs() >= 0.001
    {
        return Some("strict-same-angle rejects an angle mix");
    }
    None
}

fn resolve_must_fulfill_penalty(
    input: &CuttingEngineInput,
    unit: &CuttingUnitInput,
    produced_pieces: u32,
) -> f64 {
    if input.rule_strategy.must_fulfill_mode != CuttingMustFulfillMode::SoftPenalty
        || !unit.must_fulfill
    {
        return 0.0;
    }
    let unmet_pieces = unit.quantity.saturating_sub(produced_pieces);
    if unmet_pieces == 0 {
        return 0.0;
    }
    (f64::from(unmet_pieces) / f64::from(unit.quantity)) * input.weights.must_fulfill_penalty_weight
}

fn input_unit_index(input: &CuttingEngineInput, target: &CuttingUnitInput) -> usize {
    input
        .cut_units
        .iter()
        .position(|unit| std::ptr::eq(unit, target))
        .unwrap_or(usize::MAX)
}

fn build_combined_rule_diagnostics(
    input: &CuttingEngineInput,
    packed_units: &[PackedUnit],
) -> CuttingPlanRuleDiagnostics {
    let units = packed_units
        .iter()
        .map(|packed| &input.cut_units[packed.unit_index])
        .collect::<Vec<_>>();
    let first = units.first().copied();
    let common_group = first
        .filter(|unit| {
            units
                .iter()
                .all(|candidate| normalized_group_key(candidate) == normalized_group_key(unit))
        })
        .map(|unit| unit.roll_group_key.trim().to_string())
        .unwrap_or_default();
    let mut process_tags = units
        .iter()
        .flat_map(|unit| unit.process_tags.iter().cloned())
        .map(|tag| tag.trim().to_lowercase())
        .filter(|tag| !tag.is_empty())
        .collect::<Vec<_>>();
    process_tags.sort();
    process_tags.dedup();

    CuttingPlanRuleDiagnostics {
        priority: units.iter().map(|unit| unit.priority).fold(0.0, f64::max),
        must_fulfill: units.iter().any(|unit| unit.must_fulfill),
        allow_mixed_plan: units.iter().all(|unit| unit.allow_mixed_plan),
        roll_group_key: common_group,
        order_sequence: units
            .iter()
            .map(|unit| normalized_order_sequence(unit))
            .min()
            .unwrap_or(0),
        process_tags,
        must_fulfill_count: 0,
        mixed_plan_restricted_count: 0,
        roll_group_count: 0,
        process_tag_count: 0,
        priority_sum: 0.0,
        sequence_span: 0,
    }
}

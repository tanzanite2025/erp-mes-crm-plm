use std::cmp::Ordering;

use crate::geometry::{fit_count, resolve_decision_length, round3};
use crate::rules::summarize_input_rule_diagnostics;
use crate::{
    CuttingAngleMixMode, CuttingDirectionStrategy, CuttingEngineError, CuttingEngineInput,
    CuttingLayoutZone, CuttingMixingStrategy, CuttingMustFulfillMode, CuttingOrderStrategy,
    CuttingPlan, CuttingPlanRuleDiagnostics, CuttingRollSummary, CuttingUnitInput, CuttingZoneKind,
};

const MAX_GREEDY_ROLLS: usize = 4096;

#[derive(Clone, Debug)]
struct PackedUnit {
    unit_index: usize,
    decision_length_mm: f64,
    produced_pieces: u32,
}

#[derive(Clone, Debug)]
struct RollPacking {
    roll_id: String,
    cursor_x_mm: f64,
    first_packed_index: Option<usize>,
    last_packed_index: Option<usize>,
    direction_switch_count: u32,
    angle_mix_violation_count: u32,
    packed_units: Vec<PackedUnit>,
    zones: Vec<CuttingLayoutZone>,
}

impl RollPacking {
    fn new(input: &CuttingEngineInput, roll_index: usize) -> Self {
        let roll_id = format!("rust-wasm-roll-{}", roll_index + 1);
        Self {
            roll_id: roll_id.clone(),
            cursor_x_mm: input.edge_trim_mm,
            first_packed_index: None,
            last_packed_index: None,
            direction_switch_count: 0,
            angle_mix_violation_count: 0,
            packed_units: Vec::new(),
            zones: vec![CuttingLayoutZone {
                id: roll_id.clone(),
                kind: CuttingZoneKind::Roll,
                roll_id: Some(roll_id),
                x_mm: 0.0,
                y_mm: 0.0,
                width_mm: round3(input.roll_width_mm),
                height_mm: round3(input.roll_length_mm),
                label: "Roll".to_string(),
                unit_id: None,
                allocated_pieces: 0,
            }],
        }
    }

    fn is_empty(&self) -> bool {
        self.packed_units.is_empty()
    }
}

pub(crate) fn try_build_multi_roll_plan<F>(
    input: &CuttingEngineInput,
    elapsed_seconds: &mut F,
) -> Result<Option<(CuttingPlan, Vec<String>)>, CuttingEngineError>
where
    F: FnMut() -> f64,
{
    if input.cut_units.is_empty() {
        return Ok(None);
    }

    let usable_width_mm = input.roll_width_mm - input.edge_trim_mm * 2.0;
    let usable_length_mm = input.roll_length_mm - input.edge_trim_mm * 2.0;
    let roll_area_m2 = (input.roll_width_mm * input.roll_length_mm) / 1_000_000.0;
    let mut rolls = Vec::<RollPacking>::new();
    let mut produced_by_unit = vec![0u32; input.cut_units.len()];
    let mut warnings = vec!["multi-roll rectangular greedy packing".to_string()];
    let input_rule_diagnostics = summarize_input_rule_diagnostics(input);
    if input_rule_diagnostics.has_contract_rules() {
        warnings.push(format!(
            "P0 rule contract received mustFulfill={}, mixedRestricted={}, rollGroups={}, processTags={}, prioritySum={:.3}, sequenceSpan={}, strategy=({:?}/{:?}/{:?}/{:?}); consumed by multi-roll greedy constraints",
            input_rule_diagnostics.must_fulfill_count,
            input_rule_diagnostics.mixed_plan_restricted_count,
            input_rule_diagnostics.roll_group_count,
            input_rule_diagnostics.process_tag_count,
            input_rule_diagnostics.priority_sum,
            input_rule_diagnostics.sequence_span,
            input.rule_strategy.must_fulfill_mode,
            input.rule_strategy.mixing_strategy,
            input.rule_strategy.order_strategy,
            input.rule_strategy.direction_strategy,
        ));
    }
    let ordered_indices = order_unit_indices(input);
    let mut first_decision_length_mm: Option<f64> = None;
    let mut budget_reached = false;

    for unit_index in ordered_indices {
        let unit = &input.cut_units[unit_index];
        let decision_length_mm = resolve_decision_length(input, unit)?;
        first_decision_length_mm.get_or_insert(decision_length_mm);
        let pieces_per_strip = fit_count(usable_length_mm, decision_length_mm, input.knife_gap_mm);
        let mut remaining_pieces = unit.quantity;

        while remaining_pieces > 0 {
            if let Some(budget) = input.max_solve_duration_seconds {
                let elapsed = elapsed_seconds();
                if elapsed.is_finite() && elapsed >= budget {
                    warnings.push(format!(
                        "solve time budget {:.3}s reached after {:.3}s; remaining {} has {} piece(s) pending",
                        budget, elapsed, unit.id, remaining_pieces
                    ));
                    budget_reached = true;
                    break;
                }
            }

            let mut target_roll_index = None;
            let mut target_capacity = 0;
            let mut saw_compatible_roll = false;
            for (roll_index, roll) in rolls.iter().enumerate() {
                if !can_accept_unit(input, roll, unit_index) {
                    continue;
                }
                saw_compatible_roll = true;
                let capacity = resolve_roll_capacity(
                    roll,
                    unit,
                    usable_width_mm,
                    pieces_per_strip,
                    input.knife_gap_mm,
                    input.edge_trim_mm,
                );
                if capacity > 0 {
                    target_roll_index = Some(roll_index);
                    target_capacity = capacity;
                    break;
                }
            }

            if target_roll_index.is_none() {
                if !saw_compatible_roll {
                    if let Some(reason) = rolls.iter().find_map(|roll| {
                        roll.first_packed_index.and_then(|first_index| {
                            incompatibility_reason(input, &input.cut_units[first_index], unit)
                        })
                    }) {
                        warnings.push(format!("{} allocated to a new roll: {}", unit.id, reason));
                    }
                }
                if rolls.len() >= MAX_GREEDY_ROLLS {
                    warnings.push(format!(
                        "greedy roll safety cap {} reached; remaining {} has {} piece(s) pending",
                        MAX_GREEDY_ROLLS, unit.id, remaining_pieces
                    ));
                    budget_reached = true;
                    break;
                }
                let new_roll = RollPacking::new(input, rolls.len());
                target_capacity = resolve_roll_capacity(
                    &new_roll,
                    unit,
                    usable_width_mm,
                    pieces_per_strip,
                    input.knife_gap_mm,
                    input.edge_trim_mm,
                );
                if target_capacity == 0 {
                    warnings.push(format!(
                        "{} cannot fit within the usable area of a new roll",
                        unit.id
                    ));
                    break;
                }
                rolls.push(new_roll);
                target_roll_index = Some(rolls.len() - 1);
            }

            let roll_index = target_roll_index.expect("target roll should exist");
            if target_capacity == 0 {
                warnings.push(format!(
                    "{} cannot fit within the usable area of a roll",
                    unit.id
                ));
                break;
            }

            let produced_pieces = remaining_pieces.min(target_capacity);
            place_unit_on_roll(
                input,
                &mut rolls[roll_index],
                unit_index,
                decision_length_mm,
                produced_pieces,
                pieces_per_strip,
            );
            produced_by_unit[unit_index] =
                produced_by_unit[unit_index].saturating_add(produced_pieces);
            remaining_pieces = remaining_pieces.saturating_sub(produced_pieces);
        }

        if budget_reached {
            break;
        }
    }

    if rolls.iter().all(RollPacking::is_empty) {
        return Ok(None);
    }

    let used_area_m2 = input
        .cut_units
        .iter()
        .enumerate()
        .map(|(unit_index, unit)| {
            let decision_length_mm = resolve_decision_length(input, unit).unwrap_or(0.0);
            unit.width_mm * decision_length_mm * f64::from(produced_by_unit[unit_index])
                / 1_000_000.0
        })
        .sum::<f64>();
    let utilization_percent = if roll_area_m2 > 0.0 {
        (used_area_m2 / (roll_area_m2 * rolls.len() as f64)) * 100.0
    } else {
        0.0
    };
    let loss_area_m2 = round3((roll_area_m2 * rolls.len() as f64 - used_area_m2).max(0.0));
    let must_fulfill_penalty = input
        .cut_units
        .iter()
        .enumerate()
        .map(|(unit_index, unit)| {
            resolve_must_fulfill_penalty(input, unit, produced_by_unit[unit_index])
        })
        .sum::<f64>();
    let must_fulfill_satisfied = input
        .cut_units
        .iter()
        .enumerate()
        .filter(|(_, unit)| unit.must_fulfill)
        .all(|(unit_index, unit)| produced_by_unit[unit_index] >= unit.quantity);
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
    let direction_switch_count = rolls
        .iter()
        .map(|roll| roll.direction_switch_count)
        .sum::<u32>();
    let angle_mix_violation_count = rolls
        .iter()
        .map(|roll| roll.angle_mix_violation_count)
        .sum::<u32>();
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

    if rolls.len() > 1 {
        warnings.push(format!(
            "demand lines were allocated across {} rolls; cross-roll global optimization is not executed",
            rolls.len()
        ));
    }
    if direction_switch_count > 0 {
        warnings.push(format!(
            "multi-roll plan contains {} direction switch(es)",
            direction_switch_count
        ));
    }
    if angle_mix_violation_count > 0 {
        warnings.push(format!(
            "multi-roll plan contains {} angle mix violation(s)",
            angle_mix_violation_count
        ));
    }
    if input.cut_units.iter().any(|unit| unit.must_fulfill) && !must_fulfill_satisfied {
        warnings.push(
            "multi-roll plan does not fully satisfy every mustFulfill demand line".to_string(),
        );
    }

    let first_decision_length_mm = first_decision_length_mm.unwrap_or(0.0);
    let has_multiple_decision_lengths = input
        .cut_units
        .iter()
        .enumerate()
        .filter(|(unit_index, _)| produced_by_unit[*unit_index] > 0)
        .any(|(_, unit)| {
            (resolve_decision_length(input, unit).unwrap_or(0.0) - first_decision_length_mm).abs()
                >= 0.001
        });
    if has_multiple_decision_lengths {
        warnings
            .push("multi-roll plan uses independent decision lengths per demand line".to_string());
    }

    let packed_units = rolls
        .iter()
        .flat_map(|roll| roll.packed_units.iter().cloned())
        .collect::<Vec<_>>();
    let rule_diagnostics = build_combined_rule_diagnostics(input, &packed_units);
    let roll_summaries = rolls
        .iter()
        .map(|roll| {
            let roll_used_area_m2 = roll
                .packed_units
                .iter()
                .map(|packed| {
                    let unit = &input.cut_units[packed.unit_index];
                    unit.width_mm * packed.decision_length_mm * f64::from(packed.produced_pieces)
                        / 1_000_000.0
                })
                .sum::<f64>();
            CuttingRollSummary {
                roll_id: roll.roll_id.clone(),
                produced_pieces: roll
                    .packed_units
                    .iter()
                    .map(|packed| packed.produced_pieces)
                    .sum(),
                utilization_percent: round3(if roll_area_m2 > 0.0 {
                    (roll_used_area_m2 / roll_area_m2) * 100.0
                } else {
                    0.0
                }),
                loss_area_m2: round3((roll_area_m2 - roll_used_area_m2).max(0.0)),
            }
        })
        .collect::<Vec<_>>();
    let plan = CuttingPlan {
        plan_id: "plan-multi-roll-greedy".to_string(),
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
        rolls: roll_summaries,
        rule_diagnostics: CuttingPlanRuleDiagnostics {
            must_fulfill_count: input_rule_diagnostics.must_fulfill_count,
            mixed_plan_restricted_count: input_rule_diagnostics.mixed_plan_restricted_count,
            roll_group_count: input_rule_diagnostics.roll_group_count,
            process_tag_count: input_rule_diagnostics.process_tag_count,
            priority_sum: input_rule_diagnostics.priority_sum,
            sequence_span: input_rule_diagnostics.sequence_span,
            ..rule_diagnostics
        },
        zones: rolls.into_iter().flat_map(|roll| roll.zones).collect(),
        warnings: warnings.clone(),
    };

    Ok(Some((plan, warnings)))
}

fn can_accept_unit(input: &CuttingEngineInput, roll: &RollPacking, unit_index: usize) -> bool {
    let candidate = &input.cut_units[unit_index];
    let Some(first_index) = roll.first_packed_index else {
        return true;
    };
    if first_index == unit_index
        || roll
            .packed_units
            .iter()
            .any(|packed| packed.unit_index == unit_index)
    {
        return true;
    }
    incompatibility_reason(input, &input.cut_units[first_index], candidate).is_none()
}

fn resolve_roll_capacity(
    roll: &RollPacking,
    unit: &CuttingUnitInput,
    usable_width_mm: f64,
    pieces_per_strip: u32,
    knife_gap_mm: f64,
    edge_trim_mm: f64,
) -> u32 {
    let used_width_mm = (roll.cursor_x_mm - edge_trim_mm).max(0.0);
    let remaining_width_mm = (usable_width_mm - used_width_mm).max(0.0);
    let strips_available = fit_count(remaining_width_mm, unit.width_mm, knife_gap_mm);
    pieces_per_strip.saturating_mul(strips_available)
}

fn place_unit_on_roll(
    input: &CuttingEngineInput,
    roll: &mut RollPacking,
    unit_index: usize,
    decision_length_mm: f64,
    produced_pieces: u32,
    pieces_per_strip: u32,
) {
    let unit = &input.cut_units[unit_index];
    let strips_needed = produced_pieces.saturating_add(pieces_per_strip.saturating_sub(1))
        / pieces_per_strip.max(1);
    let mut remaining_pieces = produced_pieces;

    for strip_index in 0..strips_needed {
        let strip_pieces = remaining_pieces.min(pieces_per_strip);
        let strip_height_mm = decision_length_mm * f64::from(strip_pieces)
            + input.knife_gap_mm * f64::from(strip_pieces.saturating_sub(1));
        let strip_x_mm =
            roll.cursor_x_mm + f64::from(strip_index) * (unit.width_mm + input.knife_gap_mm);

        roll.zones.push(CuttingLayoutZone {
            id: format!(
                "{}-material-{}-strip-{}",
                roll.roll_id,
                unit.id,
                strip_index + 1
            ),
            kind: CuttingZoneKind::Material,
            roll_id: Some(roll.roll_id.clone()),
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

    roll.cursor_x_mm +=
        f64::from(strips_needed) * unit.width_mm + input.knife_gap_mm * f64::from(strips_needed);

    if let Some(last_index) = roll.last_packed_index {
        if normalized_direction_key(&input.cut_units[last_index]) != normalized_direction_key(unit)
        {
            roll.direction_switch_count += 1;
        }
        if (input.cut_units[last_index].cut_angle_deg - unit.cut_angle_deg).abs() >= 0.001
            && input.direction_rules.angle_mix_mode != CuttingAngleMixMode::Allow
        {
            roll.angle_mix_violation_count += 1;
        }
    }

    roll.first_packed_index.get_or_insert(unit_index);
    roll.last_packed_index = Some(unit_index);
    roll.packed_units.push(PackedUnit {
        unit_index,
        decision_length_mm,
        produced_pieces,
    });
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

mod geometry;
mod rules;
mod scoring;
mod types;
mod validation;

use geometry::{build_zones, fit_count, percent, resolve_decision_length, round3};
use rules::{
    build_plan_rule_diagnostics, build_plan_warnings, count_angle_mix_violations,
    count_direction_switches, resolve_plan_angle_mix_violation_count,
    resolve_plan_direction_switch_count, summarize_input_rule_diagnostics,
};
use scoring::{
    resolve_must_fulfill_penalty, resolve_must_fulfill_satisfied, score_plan, sort_plans,
};
pub use types::{
    CuttingAngleMixMode, CuttingDirectionStrategy, CuttingEngineDirectionRules, CuttingEngineError,
    CuttingEngineInput, CuttingEngineOutput, CuttingEngineRuleStrategy, CuttingEngineWeights,
    CuttingLayoutZone, CuttingMixingStrategy, CuttingMustFulfillMode, CuttingObjectivePreset,
    CuttingOrderStrategy, CuttingPlan, CuttingPlanRuleDiagnostics, CuttingUnitInput,
    CuttingZoneKind,
};
use validation::validate_input;

pub fn solve(input: &CuttingEngineInput) -> Result<CuttingEngineOutput, CuttingEngineError> {
    validate_input(input)?;

    let usable_width_mm = input.roll_width_mm - input.edge_trim_mm * 2.0;
    let usable_length_mm = input.roll_length_mm - input.edge_trim_mm * 2.0;
    let global_direction_switch_count = count_direction_switches(&input.cut_units);
    let global_angle_mix_violation_count = count_angle_mix_violations(input);
    let mut plans = Vec::new();
    let mut warnings = Vec::new();

    if global_direction_switch_count > 0 {
        warnings.push(format!(
            "direction rule detected {} direction switch(es)",
            global_direction_switch_count
        ));
    }
    if global_angle_mix_violation_count > 0 {
        warnings.push(format!(
            "angle mix policy {:?} detected {} violation(s)",
            input.direction_rules.angle_mix_mode, global_angle_mix_violation_count
        ));
    }
    let input_rule_diagnostics = summarize_input_rule_diagnostics(input);
    if input_rule_diagnostics.has_contract_rules() {
        warnings.push(format!(
            "P0 rule contract received mustFulfill={}, mixedRestricted={}, rollGroups={}, processTags={}, prioritySum={:.3}, sequenceSpan={}, strategy=({:?}/{:?}/{:?}/{:?}); diagnostics only",
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

    for unit in &input.cut_units {
        let decision_length_mm = resolve_decision_length(input, unit)?;
        let pieces_per_row = fit_count(usable_width_mm, unit.width_mm, input.knife_gap_mm);
        let rows_per_roll = fit_count(usable_length_mm, decision_length_mm, input.knife_gap_mm);
        let capacity = pieces_per_row.saturating_mul(rows_per_roll);
        let produced_pieces = capacity.min(unit.quantity);

        let must_fulfill_satisfied = resolve_must_fulfill_satisfied(unit, produced_pieces);
        if unit.must_fulfill
            && !must_fulfill_satisfied
            && input.rule_strategy.must_fulfill_mode == CuttingMustFulfillMode::Strict
        {
            warnings.push(format!(
                "mustFulfill strict rejected {} with {}/{} produced piece(s)",
                unit.id, produced_pieces, unit.quantity
            ));
            continue;
        }

        if produced_pieces == 0 {
            if unit.must_fulfill
                && input.rule_strategy.must_fulfill_mode == CuttingMustFulfillMode::SoftPenalty
            {
                warnings.push(format!(
                    "mustFulfill soft penalty retained {} with zero produced piece(s)",
                    unit.id
                ));
            } else {
                warnings.push(format!(
                    "{} cannot fit within the usable roll area",
                    unit.id
                ));
                continue;
            }
        }

        let must_fulfill_penalty = resolve_must_fulfill_penalty(input, unit, produced_pieces);
        if must_fulfill_penalty > 0.0 {
            warnings.push(format!(
                "mustFulfill soft penalty applied to {} with {:.3} penalty",
                unit.id, must_fulfill_penalty
            ));
        }

        let used_area_m2 =
            (unit.width_mm * decision_length_mm * f64::from(produced_pieces)) / 1_000_000.0;
        let roll_area_m2 = (input.roll_width_mm * input.roll_length_mm) / 1_000_000.0;
        let utilization_percent = percent(used_area_m2, roll_area_m2);
        let loss_area_m2 = round3((roll_area_m2 - used_area_m2).max(0.0));
        let direction_switch_count = resolve_plan_direction_switch_count(input, unit);
        let angle_mix_violation_count = resolve_plan_angle_mix_violation_count(input, unit);
        let score = score_plan(
            input,
            unit,
            utilization_percent,
            rows_per_roll,
            loss_area_m2,
            direction_switch_count,
            angle_mix_violation_count,
            must_fulfill_penalty,
        );
        let plan_warnings = build_plan_warnings(
            input,
            unit,
            direction_switch_count,
            angle_mix_violation_count,
        );

        plans.push(CuttingPlan {
            plan_id: format!("plan-{}", unit.id),
            score,
            decision_length_mm: round3(decision_length_mm),
            utilization_percent: round3(utilization_percent),
            loss_area_m2,
            produced_pieces,
            direction_switch_count,
            angle_mix_violation_count,
            must_fulfill_satisfied,
            must_fulfill_penalty,
            rule_diagnostics: build_plan_rule_diagnostics(&input_rule_diagnostics, unit),
            zones: build_zones(input, unit, produced_pieces, decision_length_mm),
            warnings: plan_warnings,
        });
    }

    sort_plans(&mut plans, input.objective_preset);
    plans.truncate(input.max_candidate_plans.max(1));

    Ok(CuttingEngineOutput { plans, warnings })
}
#[cfg(test)]
mod tests {
    use super::*;

    fn base_input() -> CuttingEngineInput {
        CuttingEngineInput {
            roll_width_mm: 980.0,
            roll_length_mm: 12_000.0,
            knife_gap_mm: 2.0,
            edge_trim_mm: 10.0,
            min_supported_length_mm: 80.0,
            max_supported_length_mm: 1200.0,
            fixed_decision_length_mm: Some(91.0),
            objective_preset: CuttingObjectivePreset::YieldFirst,
            weights: CuttingEngineWeights {
                utilization_weight: 55.0,
                stability_weight: 10.0,
                split_penalty: 6.0,
                must_fulfill_penalty_weight: 6000.0,
            },
            direction_rules: CuttingEngineDirectionRules {
                angle_mix_mode: CuttingAngleMixMode::PreferSameAngle,
                same_direction_preferred: true,
                direction_switch_penalty_weight: 4.0,
            },
            rule_strategy: CuttingEngineRuleStrategy {
                must_fulfill_mode: CuttingMustFulfillMode::SoftPenalty,
                mixing_strategy: CuttingMixingStrategy::SameGroupOnly,
                order_strategy: CuttingOrderStrategy::SoftPenalty,
                direction_strategy: CuttingDirectionStrategy::SameDirectionPreferred,
            },
            cut_units: vec![CuttingUnitInput {
                id: "unit-91".to_string(),
                label: "91mm yarn".to_string(),
                width_mm: 120.0,
                length_mm: 91.0,
                quantity: 100,
                cut_angle_deg: 0.0,
                priority: 1.0,
                must_fulfill: true,
                allow_mixed_plan: false,
                roll_group_key: "group-a".to_string(),
                order_sequence: 1,
                yarn_direction_mode: "warp".to_string(),
                process_tags: vec!["autoclave".to_string()],
            }],
            max_candidate_plans: 3,
        }
    }

    #[test]
    fn fixed_decision_length_overrides_unit_length() {
        let mut input = base_input();
        input.fixed_decision_length_mm = Some(100.0);

        let output = solve(&input).expect("solver should accept fixed decision length");

        assert_eq!(output.plans.len(), 1);
        assert_eq!(output.plans[0].decision_length_mm, 100.0);
    }

    #[test]
    fn rejects_fixed_decision_length_out_of_range() {
        let mut input = base_input();
        input.fixed_decision_length_mm = Some(1201.0);

        let error = solve(&input).expect_err("out-of-range fixed length should fail");

        assert_eq!(error, CuttingEngineError::FixedDecisionLengthOutOfRange);
    }

    #[test]
    fn clamps_unit_length_to_supported_boundary_when_no_fixed_value_exists() {
        let mut input = base_input();
        input.fixed_decision_length_mm = None;
        input.cut_units[0].length_mm = 60.0;

        let output = solve(&input).expect("solver should clamp to min boundary");

        assert_eq!(output.plans[0].decision_length_mm, 80.0);
    }

    #[test]
    fn rejects_non_finite_fixed_decision_length() {
        let mut input = base_input();
        input.fixed_decision_length_mm = Some(f64::NAN);

        let error = solve(&input).expect_err("non-finite fixed length should fail");

        assert_eq!(error, CuttingEngineError::FixedDecisionLengthOutOfRange);
    }

    #[test]
    fn rejects_non_finite_weights() {
        let mut input = base_input();
        input.weights.utilization_weight = f64::NAN;

        let error = solve(&input).expect_err("non-finite weight should fail");

        assert_eq!(error, CuttingEngineError::InvalidWeight);
    }

    #[test]
    fn rejects_non_finite_cut_angle() {
        let mut input = base_input();
        input.cut_units[0].cut_angle_deg = f64::INFINITY;

        let error = solve(&input).expect_err("non-finite cut angle should fail");

        assert_eq!(
            error,
            CuttingEngineError::InvalidCutUnit("unit-91".to_string())
        );
    }

    #[test]
    fn rejects_edge_trim_that_consumes_usable_area() {
        let mut input = base_input();
        input.edge_trim_mm = 490.0;

        let error = solve(&input).expect_err("edge trim must leave usable width and length");

        assert_eq!(error, CuttingEngineError::InvalidUsableArea);
    }

    #[test]
    fn exposes_p0_rule_contract_diagnostics() {
        let input = base_input();

        let output = solve(&input).expect("solver should expose P0 rule diagnostics");
        let diagnostics = &output.plans[0].rule_diagnostics;

        assert_eq!(diagnostics.priority, 1.0);
        assert!(diagnostics.must_fulfill);
        assert!(!diagnostics.allow_mixed_plan);
        assert_eq!(diagnostics.roll_group_key, "group-a");
        assert_eq!(diagnostics.order_sequence, 1);
        assert_eq!(diagnostics.process_tags, vec!["autoclave".to_string()]);
        assert_eq!(diagnostics.must_fulfill_count, 1);
        assert_eq!(diagnostics.mixed_plan_restricted_count, 1);
        assert_eq!(diagnostics.roll_group_count, 1);
        assert_eq!(diagnostics.process_tag_count, 1);
        assert_eq!(diagnostics.priority_sum, 1.0);
        assert!(output
            .warnings
            .iter()
            .any(|warning| warning.contains("P0 rule contract received")));
    }

    #[test]
    fn strict_must_fulfill_rejects_zero_production_plan() {
        let mut input = base_input();
        input.rule_strategy.must_fulfill_mode = CuttingMustFulfillMode::Strict;
        input.cut_units[0].width_mm = 10_000.0;

        let output = solve(&input).expect("strict mustFulfill should solve with no feasible plan");

        assert!(output.plans.is_empty());
        assert!(output
            .warnings
            .iter()
            .any(|warning| warning.contains("mustFulfill strict rejected")));
    }

    #[test]
    fn soft_must_fulfill_keeps_zero_production_with_penalty() {
        let mut input = base_input();
        input.rule_strategy.must_fulfill_mode = CuttingMustFulfillMode::SoftPenalty;
        input.cut_units[0].width_mm = 10_000.0;

        let output = solve(&input).expect("soft mustFulfill should keep penalized plan");

        assert_eq!(output.plans.len(), 1);
        assert_eq!(output.plans[0].produced_pieces, 0);
        assert!(!output.plans[0].must_fulfill_satisfied);
        assert_eq!(output.plans[0].must_fulfill_penalty, 6000.0);
        assert!(output.plans[0].score < -5000.0);
    }

    #[test]
    fn ignore_must_fulfill_does_not_keep_zero_production_plan() {
        let mut input = base_input();
        input.rule_strategy.must_fulfill_mode = CuttingMustFulfillMode::Ignore;
        input.cut_units[0].width_mm = 10_000.0;

        let output =
            solve(&input).expect("ignore mustFulfill should keep legacy zero-fit behavior");

        assert!(output.plans.is_empty());
        assert!(output
            .warnings
            .iter()
            .any(|warning| warning.contains("cannot fit within the usable roll area")));
    }

    #[test]
    fn sorts_equal_plans_by_plan_id() {
        let mut input = base_input();
        input.cut_units = vec![
            CuttingUnitInput {
                id: "unit-b".to_string(),
                label: "B".to_string(),
                width_mm: 120.0,
                length_mm: 91.0,
                quantity: 100,
                cut_angle_deg: 0.0,
                priority: 1.0,
                must_fulfill: false,
                allow_mixed_plan: true,
                roll_group_key: "group-b".to_string(),
                order_sequence: 2,
                yarn_direction_mode: "warp".to_string(),
                process_tags: vec!["trim".to_string()],
            },
            CuttingUnitInput {
                id: "unit-a".to_string(),
                label: "A".to_string(),
                width_mm: 120.0,
                length_mm: 91.0,
                quantity: 100,
                cut_angle_deg: 0.0,
                priority: 1.0,
                must_fulfill: false,
                allow_mixed_plan: true,
                roll_group_key: "group-a".to_string(),
                order_sequence: 1,
                yarn_direction_mode: "warp".to_string(),
                process_tags: vec!["trim".to_string()],
            },
        ];

        let output = solve(&input).expect("solver should produce deterministic ties");

        assert_eq!(output.plans[0].plan_id, "plan-unit-a");
        assert_eq!(output.plans[1].plan_id, "plan-unit-b");
    }
}

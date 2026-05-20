use crate::geometry::round3;
use crate::{
    CuttingAngleMixMode, CuttingEngineInput, CuttingMustFulfillMode, CuttingObjectivePreset,
    CuttingPlan, CuttingUnitInput,
};

pub(crate) fn resolve_must_fulfill_satisfied(
    unit: &CuttingUnitInput,
    produced_pieces: u32,
) -> bool {
    !unit.must_fulfill || produced_pieces >= unit.quantity
}

pub(crate) fn resolve_must_fulfill_penalty(
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

    round3(
        (f64::from(unmet_pieces) / f64::from(unit.quantity))
            * input.weights.must_fulfill_penalty_weight,
    )
}

pub(crate) fn score_plan(
    input: &CuttingEngineInput,
    unit: &CuttingUnitInput,
    utilization_percent: f64,
    rows_per_roll: u32,
    loss_area_m2: f64,
    direction_switch_count: u32,
    angle_mix_violation_count: u32,
    must_fulfill_penalty: f64,
) -> f64 {
    let stability_score = match input.objective_preset {
        CuttingObjectivePreset::YieldFirst => f64::from(rows_per_roll).min(100.0),
        CuttingObjectivePreset::StabilityFirst => {
            (100.0 - f64::from(rows_per_roll).saturating_sub_like(1.0)).max(0.0)
        }
    };
    let direction_bonus = if input.direction_rules.same_direction_preferred
        && !unit.yarn_direction_mode.trim().is_empty()
    {
        input.direction_rules.direction_switch_penalty_weight
    } else {
        0.0
    };
    let direction_penalty =
        f64::from(direction_switch_count) * input.direction_rules.direction_switch_penalty_weight;
    let angle_mix_multiplier = match input.direction_rules.angle_mix_mode {
        CuttingAngleMixMode::Allow => 0.0,
        CuttingAngleMixMode::PreferSameAngle => 0.5,
        CuttingAngleMixMode::StrictSameAngle => 2.0,
    };
    let angle_mix_penalty = f64::from(angle_mix_violation_count)
        * input.direction_rules.direction_switch_penalty_weight
        * angle_mix_multiplier;
    round3(
        utilization_percent * input.weights.utilization_weight
            + stability_score * input.weights.stability_weight
            + direction_bonus
            - loss_area_m2 * input.weights.split_penalty,
    ) - round3(direction_penalty + angle_mix_penalty + must_fulfill_penalty)
}

pub(crate) fn sort_plans(plans: &mut [CuttingPlan], objective: CuttingObjectivePreset) {
    plans.sort_by(|left, right| {
        let ordering = match objective {
            CuttingObjectivePreset::YieldFirst => right
                .utilization_percent
                .partial_cmp(&left.utilization_percent),
            CuttingObjectivePreset::StabilityFirst => right
                .decision_length_mm
                .partial_cmp(&left.decision_length_mm),
        };

        ordering
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| {
                right
                    .score
                    .partial_cmp(&left.score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .then_with(|| left.plan_id.cmp(&right.plan_id))
    });
}

trait SaturatingSubLike {
    fn saturating_sub_like(self, rhs: Self) -> Self;
}

impl SaturatingSubLike for f64 {
    fn saturating_sub_like(self, rhs: Self) -> Self {
        (self - rhs).max(0.0)
    }
}

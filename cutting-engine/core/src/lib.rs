#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CuttingObjectivePreset {
    YieldFirst,
    StabilityFirst,
}

#[derive(Clone, Copy, Debug)]
pub struct CuttingEngineWeights {
    pub utilization_weight: f64,
    pub stability_weight: f64,
    pub split_penalty: f64,
}

#[derive(Clone, Debug)]
pub struct CuttingUnitInput {
    pub id: String,
    pub label: String,
    pub width_mm: f64,
    pub length_mm: f64,
    pub quantity: u32,
    pub cut_angle_deg: f64,
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
    pub objective_preset: CuttingObjectivePreset,
    pub weights: CuttingEngineWeights,
    pub cut_units: Vec<CuttingUnitInput>,
    pub max_candidate_plans: usize,
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
pub struct CuttingPlan {
    pub plan_id: String,
    pub score: f64,
    pub decision_length_mm: f64,
    pub utilization_percent: f64,
    pub loss_area_m2: f64,
    pub produced_pieces: u32,
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

pub fn solve(input: &CuttingEngineInput) -> Result<CuttingEngineOutput, CuttingEngineError> {
    validate_input(input)?;

    let usable_width_mm = input.roll_width_mm - input.edge_trim_mm * 2.0;
    let usable_length_mm = input.roll_length_mm - input.edge_trim_mm * 2.0;
    let mut plans = Vec::new();
    let mut warnings = Vec::new();

    for unit in &input.cut_units {
        let decision_length_mm = resolve_decision_length(input, unit)?;
        let pieces_per_row = fit_count(usable_width_mm, unit.width_mm, input.knife_gap_mm);
        let rows_per_roll = fit_count(usable_length_mm, decision_length_mm, input.knife_gap_mm);
        let capacity = pieces_per_row.saturating_mul(rows_per_roll);
        let produced_pieces = capacity.min(unit.quantity);

        if produced_pieces == 0 {
            warnings.push(format!(
                "{} cannot fit within the usable roll area",
                unit.id
            ));
            continue;
        }

        let used_area_m2 =
            (unit.width_mm * decision_length_mm * f64::from(produced_pieces)) / 1_000_000.0;
        let roll_area_m2 = (input.roll_width_mm * input.roll_length_mm) / 1_000_000.0;
        let utilization_percent = percent(used_area_m2, roll_area_m2);
        let loss_area_m2 = round3((roll_area_m2 - used_area_m2).max(0.0));
        let score = score_plan(input, utilization_percent, rows_per_roll, loss_area_m2);

        plans.push(CuttingPlan {
            plan_id: format!("plan-{}", unit.id),
            score,
            decision_length_mm: round3(decision_length_mm),
            utilization_percent: round3(utilization_percent),
            loss_area_m2,
            produced_pieces,
            zones: build_zones(input, unit, produced_pieces, decision_length_mm),
            warnings: Vec::new(),
        });
    }

    sort_plans(&mut plans, input.objective_preset);
    plans.truncate(input.max_candidate_plans.max(1));

    Ok(CuttingEngineOutput { plans, warnings })
}

fn validate_input(input: &CuttingEngineInput) -> Result<(), CuttingEngineError> {
    if input.roll_width_mm <= 0.0 || !input.roll_width_mm.is_finite() {
        return Err(CuttingEngineError::InvalidRollWidth);
    }
    if input.roll_length_mm <= 0.0 || !input.roll_length_mm.is_finite() {
        return Err(CuttingEngineError::InvalidRollLength);
    }
    if input.knife_gap_mm < 0.0 || !input.knife_gap_mm.is_finite() {
        return Err(CuttingEngineError::InvalidKnifeGap);
    }
    if input.edge_trim_mm < 0.0 || !input.edge_trim_mm.is_finite() {
        return Err(CuttingEngineError::InvalidEdgeTrim);
    }
    if input.edge_trim_mm * 2.0 >= input.roll_width_mm
        || input.edge_trim_mm * 2.0 >= input.roll_length_mm
    {
        return Err(CuttingEngineError::InvalidUsableArea);
    }
    if input.min_supported_length_mm <= 0.0
        || input.max_supported_length_mm <= 0.0
        || input.min_supported_length_mm > input.max_supported_length_mm
        || !input.min_supported_length_mm.is_finite()
        || !input.max_supported_length_mm.is_finite()
    {
        return Err(CuttingEngineError::InvalidLengthBoundary);
    }
    if let Some(value) = input.fixed_decision_length_mm {
        if !value.is_finite()
            || value < input.min_supported_length_mm
            || value > input.max_supported_length_mm
        {
            return Err(CuttingEngineError::FixedDecisionLengthOutOfRange);
        }
    }
    if !input.weights.utilization_weight.is_finite()
        || !input.weights.stability_weight.is_finite()
        || !input.weights.split_penalty.is_finite()
    {
        return Err(CuttingEngineError::InvalidWeight);
    }
    if input.cut_units.is_empty() {
        return Err(CuttingEngineError::EmptyCutUnits);
    }
    for unit in &input.cut_units {
        if unit.width_mm <= 0.0
            || unit.length_mm <= 0.0
            || unit.quantity == 0
            || !unit.width_mm.is_finite()
            || !unit.length_mm.is_finite()
            || !unit.cut_angle_deg.is_finite()
        {
            return Err(CuttingEngineError::InvalidCutUnit(unit.id.clone()));
        }
    }
    Ok(())
}

fn resolve_decision_length(
    input: &CuttingEngineInput,
    unit: &CuttingUnitInput,
) -> Result<f64, CuttingEngineError> {
    if let Some(value) = input.fixed_decision_length_mm {
        return Ok(value);
    }

    Ok(unit
        .length_mm
        .max(input.min_supported_length_mm)
        .min(input.max_supported_length_mm))
}

fn fit_count(available_mm: f64, piece_mm: f64, gap_mm: f64) -> u32 {
    if available_mm <= 0.0 || piece_mm <= 0.0 {
        return 0;
    }
    let count = ((available_mm + gap_mm) / (piece_mm + gap_mm))
        .floor()
        .max(0.0);
    if count > f64::from(u32::MAX) {
        u32::MAX
    } else {
        count as u32
    }
}

fn score_plan(
    input: &CuttingEngineInput,
    utilization_percent: f64,
    rows_per_roll: u32,
    loss_area_m2: f64,
) -> f64 {
    let stability_score = match input.objective_preset {
        CuttingObjectivePreset::YieldFirst => f64::from(rows_per_roll).min(100.0),
        CuttingObjectivePreset::StabilityFirst => {
            (100.0 - f64::from(rows_per_roll).saturating_sub_like(1.0)).max(0.0)
        }
    };
    round3(
        utilization_percent * input.weights.utilization_weight
            + stability_score * input.weights.stability_weight
            - loss_area_m2 * input.weights.split_penalty,
    )
}

fn build_zones(
    input: &CuttingEngineInput,
    unit: &CuttingUnitInput,
    produced_pieces: u32,
    decision_length_mm: f64,
) -> Vec<CuttingLayoutZone> {
    let material_width_mm = unit
        .width_mm
        .min(input.roll_width_mm - input.edge_trim_mm * 2.0);
    let material_height_mm =
        (decision_length_mm * f64::from(produced_pieces)).min(input.roll_length_mm);

    vec![
        CuttingLayoutZone {
            id: "roll".to_string(),
            kind: CuttingZoneKind::Roll,
            x_mm: 0.0,
            y_mm: 0.0,
            width_mm: round3(input.roll_width_mm),
            height_mm: round3(input.roll_length_mm),
            label: "Roll".to_string(),
        },
        CuttingLayoutZone {
            id: format!("material-{}", unit.id),
            kind: CuttingZoneKind::Material,
            x_mm: round3(input.edge_trim_mm),
            y_mm: round3(input.edge_trim_mm),
            width_mm: round3(material_width_mm),
            height_mm: round3(material_height_mm),
            label: unit.label.clone(),
        },
    ]
}

fn sort_plans(plans: &mut [CuttingPlan], objective: CuttingObjectivePreset) {
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

fn percent(value: f64, base: f64) -> f64 {
    if base <= 0.0 {
        return 0.0;
    }
    (value / base) * 100.0
}

fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
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
            },
            cut_units: vec![CuttingUnitInput {
                id: "unit-91".to_string(),
                label: "91mm yarn".to_string(),
                width_mm: 120.0,
                length_mm: 91.0,
                quantity: 100,
                cut_angle_deg: 0.0,
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
            },
            CuttingUnitInput {
                id: "unit-a".to_string(),
                label: "A".to_string(),
                width_mm: 120.0,
                length_mm: 91.0,
                quantity: 100,
                cut_angle_deg: 0.0,
            },
        ];

        let output = solve(&input).expect("solver should produce deterministic ties");

        assert_eq!(output.plans[0].plan_id, "plan-unit-a");
        assert_eq!(output.plans[1].plan_id, "plan-unit-b");
    }
}

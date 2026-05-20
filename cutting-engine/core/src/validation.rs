use crate::{CuttingEngineError, CuttingEngineInput};

pub(crate) fn validate_input(input: &CuttingEngineInput) -> Result<(), CuttingEngineError> {
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
        || !input.weights.must_fulfill_penalty_weight.is_finite()
        || input.weights.must_fulfill_penalty_weight < 0.0
        || !input
            .direction_rules
            .direction_switch_penalty_weight
            .is_finite()
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
            || !unit.priority.is_finite()
            || unit.priority < 0.0
        {
            return Err(CuttingEngineError::InvalidCutUnit(unit.id.clone()));
        }
    }
    Ok(())
}

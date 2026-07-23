use crate::{
    CuttingEngineError, CuttingEngineInput, CuttingLayoutZone, CuttingUnitInput, CuttingZoneKind,
};

pub(crate) fn resolve_decision_length(
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

pub(crate) fn fit_count(available_mm: f64, piece_mm: f64, gap_mm: f64) -> u32 {
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

pub(crate) fn build_zones(
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
            unit_id: None,
            allocated_pieces: 0,
        },
        CuttingLayoutZone {
            id: format!("material-{}", unit.id),
            kind: CuttingZoneKind::Material,
            x_mm: round3(input.edge_trim_mm),
            y_mm: round3(input.edge_trim_mm),
            width_mm: round3(material_width_mm),
            height_mm: round3(material_height_mm),
            label: unit.label.clone(),
            unit_id: Some(unit.id.clone()),
            allocated_pieces: produced_pieces,
        },
    ]
}

pub(crate) fn percent(value: f64, base: f64) -> f64 {
    if base <= 0.0 {
        return 0.0;
    }
    (value / base) * 100.0
}

pub(crate) fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

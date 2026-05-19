use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use xdfc_cutting_engine_core::{
    solve, CuttingEngineInput, CuttingEngineWeights, CuttingObjectivePreset, CuttingUnitInput,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WasmCuttingEngineInput {
    roll_width_mm: f64,
    roll_length_mm: f64,
    knife_gap_mm: f64,
    edge_trim_mm: f64,
    min_supported_length_mm: f64,
    max_supported_length_mm: f64,
    fixed_decision_length_mm: Option<f64>,
    objective_preset: String,
    weights: WasmCuttingEngineWeights,
    cut_units: Vec<WasmCuttingUnitInput>,
    max_candidate_plans: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WasmCuttingEngineWeights {
    utilization_weight: f64,
    stability_weight: f64,
    split_penalty: f64,
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
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WasmSolveEnvelope<T> {
    ok: bool,
    data: Option<T>,
    error: Option<String>,
}

#[wasm_bindgen(js_name = solveCuttingEngine)]
pub fn solve_cutting_engine(input_json: &str) -> String {
    let parsed = match serde_json::from_str::<WasmCuttingEngineInput>(input_json) {
        Ok(value) => value,
        Err(error) => return encode_error(format!("invalid input json: {error}")),
    };

    let input = match to_core_input(parsed) {
        Ok(value) => value,
        Err(error) => return encode_error(error),
    };

    match solve(&input) {
        Ok(output) => serde_json::to_string(&WasmSolveEnvelope {
            ok: true,
            data: Some(output_to_json(output)),
            error: None,
        })
        .unwrap_or_else(|error| encode_error(format!("encode output failed: {error}"))),
        Err(error) => encode_error(format!("{error:?}")),
    }
}

fn to_core_input(input: WasmCuttingEngineInput) -> Result<CuttingEngineInput, String> {
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
            })
            .collect(),
        max_candidate_plans: input.max_candidate_plans,
    })
}

fn parse_objective(value: &str) -> Result<CuttingObjectivePreset, String> {
    match value {
        "yield-first" => Ok(CuttingObjectivePreset::YieldFirst),
        "stability-first" => Ok(CuttingObjectivePreset::StabilityFirst),
        _ => Err(format!("unsupported objective preset: {value}")),
    }
}

fn output_to_json(output: xdfc_cutting_engine_core::CuttingEngineOutput) -> serde_json::Value {
    serde_json::json!({
        "plans": output.plans.into_iter().map(|plan| {
            serde_json::json!({
                "planId": plan.plan_id,
                "score": plan.score,
                "decisionLengthMm": plan.decision_length_mm,
                "utilizationPercent": plan.utilization_percent,
                "lossAreaM2": plan.loss_area_m2,
                "producedPieces": plan.produced_pieces,
                "warnings": plan.warnings,
                "zones": plan.zones.into_iter().map(|zone| {
                    serde_json::json!({
                        "id": zone.id,
                        "kind": format!("{:?}", zone.kind),
                        "xMm": zone.x_mm,
                        "yMm": zone.y_mm,
                        "widthMm": zone.width_mm,
                        "heightMm": zone.height_mm,
                        "label": zone.label,
                    })
                }).collect::<Vec<_>>()
            })
        }).collect::<Vec<_>>(),
        "warnings": output.warnings,
    })
}

fn encode_error(message: String) -> String {
    serde_json::to_string(&WasmSolveEnvelope::<serde_json::Value> {
        ok: false,
        data: None,
        error: Some(message),
    })
    .unwrap_or_else(|_| "{\"ok\":false,\"data\":null,\"error\":\"unknown error\"}".to_string())
}

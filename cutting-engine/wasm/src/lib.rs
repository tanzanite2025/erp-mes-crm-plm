mod input;
mod output;

use input::{to_core_input, WasmCuttingEngineInput};
use output::{encode_error, output_to_json, WasmSolveEnvelope};
use wasm_bindgen::prelude::*;
use xdfc_cutting_engine_core::solve;

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

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WasmSolveEnvelope<T> {
    pub(crate) ok: bool,
    pub(crate) data: Option<T>,
    pub(crate) error: Option<String>,
}

pub(crate) fn output_to_json(
    output: xdfc_cutting_engine_core::CuttingEngineOutput,
) -> serde_json::Value {
    serde_json::json!({
        "plans": output.plans.into_iter().map(|plan| {
            serde_json::json!({
                "planId": plan.plan_id,
                "score": plan.score,
                "decisionLengthMm": plan.decision_length_mm,
                "utilizationPercent": plan.utilization_percent,
                "lossAreaM2": plan.loss_area_m2,
                "producedPieces": plan.produced_pieces,
                "directionSwitchCount": plan.direction_switch_count,
                "angleMixViolationCount": plan.angle_mix_violation_count,
                "mustFulfillSatisfied": plan.must_fulfill_satisfied,
                "mustFulfillPenalty": plan.must_fulfill_penalty,
                "rolls": plan.rolls.into_iter().map(|roll| {
                    serde_json::json!({
                        "rollId": roll.roll_id,
                        "producedPieces": roll.produced_pieces,
                        "utilizationPercent": roll.utilization_percent,
                        "lossAreaM2": roll.loss_area_m2,
                    })
                }).collect::<Vec<_>>(),
                "ruleDiagnostics": {
                    "priority": plan.rule_diagnostics.priority,
                    "mustFulfill": plan.rule_diagnostics.must_fulfill,
                    "allowMixedPlan": plan.rule_diagnostics.allow_mixed_plan,
                    "rollGroupKey": plan.rule_diagnostics.roll_group_key,
                    "orderSequence": plan.rule_diagnostics.order_sequence,
                    "processTags": plan.rule_diagnostics.process_tags,
                    "mustFulfillCount": plan.rule_diagnostics.must_fulfill_count,
                    "mixedPlanRestrictedCount": plan.rule_diagnostics.mixed_plan_restricted_count,
                    "rollGroupCount": plan.rule_diagnostics.roll_group_count,
                    "processTagCount": plan.rule_diagnostics.process_tag_count,
                    "prioritySum": plan.rule_diagnostics.priority_sum,
                    "sequenceSpan": plan.rule_diagnostics.sequence_span,
                },
                "warnings": plan.warnings,
                "zones": plan.zones.into_iter().map(|zone| {
                    serde_json::json!({
                        "id": zone.id,
                        "kind": format!("{:?}", zone.kind),
                        "rollId": zone.roll_id,
                        "xMm": zone.x_mm,
                        "yMm": zone.y_mm,
                        "widthMm": zone.width_mm,
                        "heightMm": zone.height_mm,
                        "label": zone.label,
                        "unitId": zone.unit_id,
                        "allocatedPieces": zone.allocated_pieces,
                    })
                }).collect::<Vec<_>>()
            })
        }).collect::<Vec<_>>(),
        "warnings": output.warnings,
    })
}

pub(crate) fn encode_error(message: String) -> String {
    serde_json::to_string(&WasmSolveEnvelope::<serde_json::Value> {
        ok: false,
        data: None,
        error: Some(message),
    })
    .unwrap_or_else(|_| "{\"ok\":false,\"data\":null,\"error\":\"unknown error\"}".to_string())
}

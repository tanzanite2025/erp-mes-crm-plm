//! 浏览器边界适配层。
//!
//! 这里不实现任何几何解析或装箱搜索逻辑，只把输入转交给 core，
//! 再将稳定的 JSON 协议返回给前端。

use xdfc_vehicle_loading_engine_core::{
    parse_glb, plan_loading_space, plan_vehicle_loading, project_vehicle_geometry_to_loading_space,
    LoadingSpacePlanRequest, ParserLimits, VehicleGeometry, VehicleLoadingPlanRequest,
};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn parse_vehicle_geometry_glb(input: &[u8]) -> Result<String, String> {
    let geometry = parse_glb(input, &ParserLimits::default()).map_err(|error| error.to_string())?;
    serde_json::to_string(&geometry).map_err(|error| error.to_string())
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn calculate_vehicle_loading_plan(input: &str) -> Result<String, String> {
    let request: VehicleLoadingPlanRequest =
        serde_json::from_str(input).map_err(|error| format!("装箱请求 JSON 无效: {}", error))?;
    let plan = plan_vehicle_loading(&request).map_err(|error| error.to_string())?;
    serde_json::to_string(&plan).map_err(|error| error.to_string())
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn calculate_loading_plan(input: &str) -> Result<String, String> {
    let request: LoadingSpacePlanRequest = serde_json::from_str(input)
        .map_err(|error| format!("装载空间装箱请求 JSON 无效: {}", error))?;
    let plan = plan_loading_space(&request).map_err(|error| error.to_string())?;
    serde_json::to_string(&plan).map_err(|error| error.to_string())
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn project_vehicle_geometry_to_loading_space_json(input: &str) -> Result<String, String> {
    let geometry: VehicleGeometry =
        serde_json::from_str(input).map_err(|error| format!("车型几何 JSON 无效: {}", error))?;
    let projection =
        project_vehicle_geometry_to_loading_space(&geometry).map_err(|error| error.to_string())?;
    serde_json::to_string(&projection).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        calculate_loading_plan, calculate_vehicle_loading_plan, parse_vehicle_geometry_glb,
        project_vehicle_geometry_to_loading_space_json,
    };

    #[test]
    fn rejects_non_glb_input_at_wasm_boundary() {
        let error = parse_vehicle_geometry_glb(br#"{"asset":{"version":"2.0"}}"#)
            .expect_err("only GLB should be accepted");
        assert!(error.contains("GLB"));
    }

    #[test]
    fn calculates_loading_plan_at_wasm_boundary() {
        let output = calculate_vehicle_loading_plan(
            r#"{
                "schemaVersion":"vehicle-loading-request.v1",
                "vehicle":{
                    "id":"van-standard",
                    "usableSpace":{"lengthMm":1200,"widthMm":1000,"heightMm":1000},
                    "payloadKg":1000
                },
                "package":{
                    "id":"box-a",
                    "quantity":20,
                    "unitWeightKg":10,
                    "dimension":{"lengthMm":600,"widthMm":500,"heightMm":500},
                    "canRotate":true,
                    "canInvert":false
                }
            }"#,
        )
        .expect("wasm boundary should calculate plan");

        let value: serde_json::Value =
            serde_json::from_str(&output).expect("plan output should be json");
        assert_eq!(value["schemaVersion"], "vehicle-loading-plan.v1");
        assert_eq!(value["boxesPlacedInPreviewVehicle"], 8);
        assert_eq!(value["placements"].as_array().unwrap().len(), 8);
    }

    #[test]
    fn calculates_generic_loading_space_plan_at_wasm_boundary() {
        let output = calculate_loading_plan(
            r#"{
                "schemaVersion":"loading-space-plan-request.v1",
                "loadingSpace":{
                    "id":"container-20ft",
                    "usableSpace":{"lengthMm":1200,"widthMm":1000,"heightMm":1000},
                    "payloadKg":1000
                },
                "package":{
                    "id":"box-a",
                    "quantity":20,
                    "unitWeightKg":10,
                    "dimension":{"lengthMm":600,"widthMm":500,"heightMm":500},
                    "canRotate":true,
                    "canInvert":false
                }
            }"#,
        )
        .expect("wasm boundary should calculate generic loading space plan");

        let value: serde_json::Value =
            serde_json::from_str(&output).expect("plan output should be json");
        assert_eq!(value["schemaVersion"], "loading-space-plan.v1");
        assert_eq!(value["loadingSpaceId"], "container-20ft");
        assert_eq!(value["boxesPlacedInPreviewUnit"], 8);
        assert_eq!(value["placements"].as_array().unwrap().len(), 8);
    }

    #[test]
    fn projects_geometry_to_loading_space_at_wasm_boundary() {
        let output = project_vehicle_geometry_to_loading_space_json(
            r#"{
                "schemaVersion":"vehicle-geometry.v1",
                "sourceFormat":"glb",
                "unit":"mm",
                "coordinateSystem":{"lengthAxis":"x","widthAxis":"y","heightAxis":"z"},
                "bounds":{"minMm":[0,0,0],"maxMm":[1000,600,500],"lengthMm":1000,"widthMm":600,"heightMm":500},
                "parts":[
                    {
                        "id":"cargo-space",
                        "kind":"usable-space",
                        "collision":"aabb",
                        "bounds":{"minMm":[0,0,0],"maxMm":[1000,600,500],"lengthMm":1000,"widthMm":600,"heightMm":500},
                        "positionMm":[0,0,0],
                        "nodeIndex":0,
                        "meshIndex":0,
                        "vertexCount":8
                    },
                    {
                        "id":"wheel-well",
                        "kind":"obstacle",
                        "collision":"aabb",
                        "bounds":{"minMm":[100,0,0],"maxMm":[220,150,150],"lengthMm":120,"widthMm":150,"heightMm":150},
                        "positionMm":[0,0,0],
                        "nodeIndex":1,
                        "meshIndex":1,
                        "vertexCount":8
                    }
                ],
                "warnings":[]
            }"#,
        )
        .expect("wasm boundary should project geometry");

        let value: serde_json::Value =
            serde_json::from_str(&output).expect("projection output should be json");
        assert_eq!(
            value["schemaVersion"],
            "vehicle-loading-geometry-projection.v1"
        );
        assert_eq!(value["usableSpace"]["lengthMm"], 1000);
        assert_eq!(value["blockedSpaces"].as_array().unwrap().len(), 1);
    }
}

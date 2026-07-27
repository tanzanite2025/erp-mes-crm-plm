//! 浏览器边界适配层。
//!
//! 这里不实现任何几何解析或装箱搜索逻辑，只把输入转交给 core，
//! 再将稳定的 JSON 协议返回给前端。

use xdfc_vehicle_loading_engine_core::{
    diagnose_loading_space_plan, diagnose_vehicle_loading_plan, parse_glb, plan_loading_space,
    plan_vehicle_loading, project_vehicle_geometry_to_loading_space, LoadingSpacePlanRequest,
    ParserLimits, VehicleGeometry, VehicleLoadingPlanRequest,
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
pub fn diagnose_vehicle_loading_plan_json(input: &str) -> Result<String, String> {
    let request: VehicleLoadingPlanRequest =
        serde_json::from_str(input).map_err(|error| format!("装箱请求 JSON 无效: {}", error))?;
    let diagnostics = diagnose_vehicle_loading_plan(&request).map_err(|error| error.to_string())?;
    serde_json::to_string(&diagnostics).map_err(|error| error.to_string())
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn diagnose_loading_plan_json(input: &str) -> Result<String, String> {
    let request: LoadingSpacePlanRequest = serde_json::from_str(input)
        .map_err(|error| format!("装载空间装箱请求 JSON 无效: {}", error))?;
    let diagnostics = diagnose_loading_space_plan(&request).map_err(|error| error.to_string())?;
    serde_json::to_string(&diagnostics).map_err(|error| error.to_string())
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
        calculate_loading_plan, calculate_vehicle_loading_plan, diagnose_vehicle_loading_plan_json,
        parse_vehicle_geometry_glb, project_vehicle_geometry_to_loading_space_json,
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
    fn applies_horizontal_clearance_at_wasm_boundary() {
        let output = calculate_vehicle_loading_plan(
            r#"{
                "schemaVersion":"vehicle-loading-request.v1",
                "vehicle":{
                    "id":"van-clearance",
                    "usableSpace":{"lengthMm":300,"widthMm":100,"heightMm":100},
                    "payloadKg":1000,
                    "blockedSpaces":[]
                },
                "package":{
                    "id":"box-clearance",
                    "quantity":3,
                    "unitWeightKg":10,
                    "dimension":{"lengthMm":100,"widthMm":100,"heightMm":100},
                    "canRotate":false,
                    "canInvert":false
                },
                "limits":{
                    "collisionClearanceMm":1
                }
            }"#,
        )
        .expect("wasm boundary should apply horizontal clearance");

        let value: serde_json::Value =
            serde_json::from_str(&output).expect("plan output should be json");
        assert_eq!(value["engineVersion"], "vehicle-loading-core-0.9.0");
        assert_eq!(value["maxBoxesPerVehicle"], 2);
        assert_eq!(value["placements"].as_array().unwrap().len(), 2);
        assert_eq!(value["placements"][1]["positionMm"]["xMm"], 101);
        let selected_summary = value["search"]["candidateSummaries"]
            .as_array()
            .unwrap()
            .iter()
            .find(|candidate| {
                candidate["orientationLabel"] == value["selectedOrientation"]["label"]
                    && candidate["scanStrategy"] == value["search"]["selectedScanStrategy"]
            })
            .expect("selected candidate summary should be present");
        assert!(
            selected_summary["rejectionSummary"]["collisionRejectionCount"]
                .as_u64()
                .unwrap()
                > 0
        );
        assert_eq!(
            selected_summary["rejectionSummary"]["firstCollisionWitness"]["kind"],
            "placement"
        );
    }

    #[test]
    fn applies_boundary_clearance_at_wasm_boundary() {
        let output = calculate_vehicle_loading_plan(
            r#"{
                "schemaVersion":"vehicle-loading-request.v1",
                "vehicle":{
                    "id":"van-boundary-clearance",
                    "usableSpace":{"lengthMm":300,"widthMm":102,"heightMm":100},
                    "payloadKg":1000,
                    "blockedSpaces":[]
                },
                "package":{
                    "id":"box-boundary-clearance",
                    "quantity":3,
                    "unitWeightKg":10,
                    "dimension":{"lengthMm":100,"widthMm":100,"heightMm":100},
                    "canRotate":false,
                    "canInvert":false
                },
                "limits":{
                    "boundaryClearanceMm":1
                }
            }"#,
        )
        .expect("wasm boundary should apply usable-space boundary clearance");

        let value: serde_json::Value =
            serde_json::from_str(&output).expect("plan output should be json");
        assert_eq!(value["engineVersion"], "vehicle-loading-core-0.9.0");
        assert_eq!(value["maxBoxesPerVehicle"], 2);
        assert!(value["placements"]
            .as_array()
            .unwrap()
            .iter()
            .all(|placement| placement["positionMm"]["xMm"].as_u64().unwrap() >= 1));
    }

    #[test]
    fn diagnoses_no_fit_request_at_wasm_boundary() {
        let output = diagnose_vehicle_loading_plan_json(
            r#"{
                "schemaVersion":"vehicle-loading-request.v1",
                "vehicle":{
                    "id":"small-van",
                    "usableSpace":{"lengthMm":2000,"widthMm":1000,"heightMm":1000},
                    "payloadKg":1000
                },
                "package":{
                    "id":"oversized-box",
                    "quantity":1,
                    "unitWeightKg":10,
                    "dimension":{"lengthMm":2100,"widthMm":500,"heightMm":500},
                    "canRotate":false,
                    "canInvert":false
                }
            }"#,
        )
        .expect("diagnostics should be returned for a valid no-fit request");

        let value: serde_json::Value =
            serde_json::from_str(&output).expect("diagnostics output should be json");
        assert_eq!(value["schemaVersion"], "loading-plan-diagnostics.v1");
        assert_eq!(value["failureCode"], "PACKAGE_CANNOT_FIT");
        assert_eq!(
            value["orientations"][0]["reasonCode"],
            "PACKAGE_HORIZONTAL_DIMENSION_EXCEEDS_LOADING_SPACE"
        );
        assert_eq!(value["orientations"][0]["candidateAnchorCount"], 0);
    }

    #[test]
    fn applies_obb_blocked_space_at_wasm_boundary() {
        let output = calculate_vehicle_loading_plan(
            r#"{
                "schemaVersion":"vehicle-loading-request.v1",
                "vehicle":{
                    "id":"van-obb",
                    "usableSpace":{"lengthMm":250,"widthMm":250,"heightMm":100},
                    "payloadKg":1000,
                    "blockedSpaces":[
                        {
                            "id":"rotated-narrow-obstacle",
                            "kind":"keepOut",
                            "originMm":{"xMm":100,"yMm":0,"zMm":0},
                            "dimension":{"lengthMm":142,"widthMm":142,"heightMm":100},
                            "obb":{
                                "centerMm":[171,71,50],
                                "halfExtentsMm":[10,90,50],
                                "axes":[
                                    [0.7071067811865476,0.7071067811865476,0],
                                    [-0.7071067811865476,0.7071067811865476,0],
                                    [0,0,1]
                                ]
                            }
                        }
                    ]
                },
                "package":{
                    "id":"box-obb",
                    "quantity":1,
                    "unitWeightKg":10,
                    "dimension":{"lengthMm":100,"widthMm":100,"heightMm":100},
                    "canRotate":false,
                    "canInvert":false
                }
            }"#,
        )
        .expect("OBB should be accepted at the wasm boundary");

        let value: serde_json::Value =
            serde_json::from_str(&output).expect("plan output should be json");
        assert_eq!(value["engineVersion"], "vehicle-loading-core-0.9.0");
        assert!(value["placements"]
            .as_array()
            .unwrap()
            .iter()
            .any(|placement| {
                placement["positionMm"]["xMm"] == 0
                    && placement["positionMm"]["yMm"] == 0
                    && placement["positionMm"]["zMm"] == 0
            }));
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
                    },
                    {
                        "id":"rotated-keep-out",
                        "kind":"keep-out",
                        "collision":"obb",
                        "bounds":{"minMm":[250,100,0],"maxMm":[550,400,200],"lengthMm":300,"widthMm":300,"heightMm":200},
                        "obb":{
                            "centerMm":[400,250,100],
                            "halfExtentsMm":[120,40,100],
                            "axes":[
                                [0.7071067811865476,0.7071067811865476,0],
                                [-0.7071067811865476,0.7071067811865476,0],
                                [0,0,1]
                            ]
                        },
                        "positionMm":[0,0,0],
                        "nodeIndex":2,
                        "meshIndex":2,
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
        assert_eq!(value["blockedSpaces"].as_array().unwrap().len(), 2);
        assert_eq!(value["blockedSpaces"][0].get("obb"), None);
        assert_eq!(
            value["blockedSpaces"][1]["obb"]["centerMm"][0]
                .as_f64()
                .unwrap(),
            400.0
        );
        assert_eq!(
            value["blockedSpaces"][1]["obb"]["halfExtentsMm"][1]
                .as_f64()
                .unwrap(),
            40.0
        );
    }
}

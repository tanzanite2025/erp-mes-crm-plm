//! 独立的装载空间几何与装箱核心。
//!
//! 当前包含三个长期独立边界：
//!
//! - 通用装载空间规划：输入 `loading-space-plan-request.v1`，输出 `loading-space-plan.v1`；
//! - 车型装箱适配：保留 `vehicle-loading-request.v1` / `vehicle-loading-plan.v1`；
//! - 车型 GLB 解析与投影：输出 `vehicle-geometry.v1`，再投影为通用 `usableSpace + blockedSpaces`。

mod geometry;
mod geometry_projection;
mod packing;
mod parser;

pub use geometry::{
    AabbMm, CollisionKind, CoordinateSystem, GeometryObbMm, GeometryPart, GeometryWarning,
    PartKind, VehicleGeometry, VEHICLE_GEOMETRY_SCHEMA_VERSION,
};
pub use geometry_projection::{
    project_vehicle_geometry_to_loading_space, VehicleLoadingGeometryProjection,
    VehicleLoadingGeometryProjectionError, VEHICLE_LOADING_GEOMETRY_PROJECTION_SCHEMA_VERSION,
};
pub use packing::{
    diagnose_loading_space_plan, diagnose_vehicle_loading_plan, plan_loading_space,
    plan_vehicle_loading, DimensionsMm, LoadingCandidateSummary, LoadingCollisionWitness,
    LoadingGrid, LoadingOrientation, LoadingOrientationDiagnostic, LoadingPackageInput,
    LoadingPlacement, LoadingPlacementRejectionSummary, LoadingPlanDiagnostics,
    LoadingSearchLimits, LoadingSearchSummary, LoadingSpaceBlockedSpaceInput, LoadingSpaceInput,
    LoadingSpaceObbInput, LoadingSpacePlan, LoadingSpacePlanRequest, LoadingUtilization,
    LoadingWarning, PositionMm, VehicleLoadingBlockedSpaceInput, VehicleLoadingError,
    VehicleLoadingGrid, VehicleLoadingOrientation, VehicleLoadingOrientationDiagnostic,
    VehicleLoadingPackageInput, VehicleLoadingPlacement, VehicleLoadingPlan,
    VehicleLoadingPlanDiagnostics, VehicleLoadingPlanRequest, VehicleLoadingSearchLimits,
    VehicleLoadingUtilization, VehicleLoadingVehicleInput, VehicleLoadingWarning,
    LOADING_PLAN_DIAGNOSTICS_SCHEMA_VERSION, LOADING_SPACE_ENGINE_VERSION,
    LOADING_SPACE_PLAN_REQUEST_SCHEMA_VERSION, LOADING_SPACE_PLAN_SCHEMA_VERSION,
    VEHICLE_LOADING_ENGINE_VERSION, VEHICLE_LOADING_PLAN_SCHEMA_VERSION,
    VEHICLE_LOADING_REQUEST_SCHEMA_VERSION,
};
pub use parser::{parse_glb, ParseError, ParserLimits};

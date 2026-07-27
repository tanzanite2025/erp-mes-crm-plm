use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fmt::{Display, Formatter};

pub const VEHICLE_LOADING_REQUEST_SCHEMA_VERSION: &str = "vehicle-loading-request.v1";
pub const VEHICLE_LOADING_PLAN_SCHEMA_VERSION: &str = "vehicle-loading-plan.v1";
pub const LOADING_SPACE_PLAN_REQUEST_SCHEMA_VERSION: &str = "loading-space-plan-request.v1";
pub const LOADING_SPACE_PLAN_SCHEMA_VERSION: &str = "loading-space-plan.v1";
pub const LOADING_SPACE_ENGINE_VERSION: &str = "loading-space-core-0.9.0";
pub const VEHICLE_LOADING_ENGINE_VERSION: &str = "vehicle-loading-core-0.9.0";
pub const LOADING_PLAN_DIAGNOSTICS_SCHEMA_VERSION: &str = "loading-plan-diagnostics.v1";

const DEFAULT_MAX_PLACEMENT_OUTPUT: u32 = 10_000;
const DEFAULT_MAX_GRID_CELL_SCAN: u32 = 1_000_000;
const LOCAL_SEARCH_MAX_ANCHOR_COUNT: usize = 512;
const LOCAL_SEARCH_MAX_CONFLICTS: usize = 2;
const OBB_ENVELOPE_TOLERANCE_MM: f64 = 0.0001;
const SUPPORT_PLANE_TOLERANCE_MM: f64 = 0.0001;
const YAW_0: &[u16] = &[0];
const YAW_0_180: &[u16] = &[0, 180];
const YAW_90_270: &[u16] = &[90, 270];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleLoadingPlanRequest {
    pub schema_version: String,
    pub vehicle: VehicleLoadingVehicleInput,
    pub package: VehicleLoadingPackageInput,
    pub limits: Option<VehicleLoadingSearchLimits>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingSpacePlanRequest {
    pub schema_version: String,
    pub loading_space: LoadingSpaceInput,
    pub package: LoadingPackageInput,
    pub limits: Option<LoadingSearchLimits>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingSpaceInput {
    pub id: String,
    pub name: Option<String>,
    pub usable_space: DimensionsMm,
    pub blocked_spaces: Option<Vec<LoadingSpaceBlockedSpaceInput>>,
    pub payload_kg: f64,
}

pub type VehicleLoadingPackageInput = LoadingPackageInput;
pub type VehicleLoadingBlockedSpaceInput = LoadingSpaceBlockedSpaceInput;
pub type VehicleLoadingSearchLimits = LoadingSearchLimits;
pub type VehicleLoadingOrientation = LoadingOrientation;
pub type VehicleLoadingGrid = LoadingGrid;
pub type VehicleLoadingPlacement = LoadingPlacement;
pub type VehicleLoadingUtilization = LoadingUtilization;
pub type VehicleLoadingWarning = LoadingWarning;
pub type VehicleLoadingPlanDiagnostics = LoadingPlanDiagnostics;
pub type VehicleLoadingOrientationDiagnostic = LoadingOrientationDiagnostic;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleLoadingVehicleInput {
    pub id: String,
    pub name: Option<String>,
    pub usable_space: DimensionsMm,
    pub blocked_spaces: Option<Vec<VehicleLoadingBlockedSpaceInput>>,
    pub payload_kg: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingPackageInput {
    pub id: String,
    pub name: Option<String>,
    pub quantity: u32,
    pub unit_weight_kg: f64,
    pub dimension: DimensionsMm,
    pub can_rotate: bool,
    pub can_invert: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DimensionsMm {
    pub length_mm: u32,
    pub width_mm: u32,
    pub height_mm: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingSpaceBlockedSpaceInput {
    pub id: String,
    pub kind: String,
    pub origin_mm: PositionMm,
    pub dimension: DimensionsMm,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub obb: Option<LoadingSpaceObbInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingSpaceObbInput {
    pub center_mm: [f64; 3],
    pub half_extents_mm: [f64; 3],
    pub axes: [[f64; 3]; 3],
}

impl Default for LoadingSpaceBlockedSpaceInput {
    fn default() -> Self {
        Self {
            id: String::new(),
            kind: String::new(),
            origin_mm: PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 0,
                width_mm: 0,
                height_mm: 0,
            },
            obb: None,
        }
    }
}

impl DimensionsMm {
    fn volume_mm3(&self) -> u128 {
        self.length_mm as u128 * self.width_mm as u128 * self.height_mm as u128
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingSearchLimits {
    pub max_placement_output: Option<u32>,
    pub max_grid_cell_scan: Option<u32>,
    pub collision_clearance_mm: Option<u32>,
    pub boundary_clearance_mm: Option<u32>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VehicleLoadingPlan {
    pub schema_version: String,
    pub engine_version: String,
    pub vehicle_id: String,
    pub package_id: String,
    pub requested_boxes: u32,
    pub boxes_placed_in_preview_vehicle: u32,
    pub remaining_boxes_after_preview_vehicle: u32,
    pub max_boxes_per_vehicle: u32,
    pub vehicles_needed: u32,
    pub selected_orientation: VehicleLoadingOrientation,
    pub grid: VehicleLoadingGrid,
    pub utilization: VehicleLoadingUtilization,
    pub search: LoadingSearchSummary,
    pub placements: Vec<VehicleLoadingPlacement>,
    pub warnings: Vec<VehicleLoadingWarning>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingSpacePlan {
    pub schema_version: String,
    pub engine_version: String,
    pub loading_space_id: String,
    pub package_id: String,
    pub requested_boxes: u32,
    pub boxes_placed_in_preview_unit: u32,
    pub remaining_boxes_after_preview_unit: u32,
    pub max_boxes_per_unit: u32,
    pub units_needed: u32,
    pub selected_orientation: LoadingOrientation,
    pub grid: LoadingGrid,
    pub utilization: LoadingUtilization,
    pub search: LoadingSearchSummary,
    pub placements: Vec<LoadingPlacement>,
    pub warnings: Vec<LoadingWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingSearchSummary {
    pub evaluated_orientation_count: u32,
    pub evaluated_scan_strategy_count: u32,
    pub selected_scan_strategy: &'static str,
    pub candidate_summaries: Vec<LoadingCandidateSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingPlanDiagnostics {
    pub schema_version: String,
    pub engine_version: String,
    pub loading_space_id: String,
    pub package_id: String,
    pub failure_code: String,
    pub failure_message: String,
    pub evaluated_orientation_count: u32,
    pub evaluated_scan_strategy_count: u32,
    pub orientations: Vec<LoadingOrientationDiagnostic>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingOrientationDiagnostic {
    pub orientation_label: String,
    pub yaw_degrees: u16,
    pub dimension: DimensionsMm,
    pub status: String,
    pub reason_code: String,
    pub reason_message: String,
    pub candidate_anchor_count: u32,
    pub max_boxes_by_geometry: u32,
    pub max_boxes_by_weight: u32,
    pub selected_scan_strategy: Option<String>,
    pub rejection_summary: LoadingPlacementRejectionSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingPlacementRejectionSummary {
    pub evaluated_anchor_count: u32,
    pub accepted_anchor_count: u32,
    pub boundary_rejection_count: u32,
    pub blocked_space_rejection_count: u32,
    pub collision_rejection_count: u32,
    pub support_rejection_count: u32,
    pub first_collision_witness: Option<LoadingCollisionWitness>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingCollisionWitness {
    pub kind: String,
    pub anchor_mm: PositionMm,
    pub dimension: DimensionsMm,
    pub other_id: Option<String>,
    pub other_origin_mm: Option<PositionMm>,
    pub other_dimension: Option<DimensionsMm>,
    pub clearance_mm: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingCandidateSummary {
    pub orientation_label: &'static str,
    pub yaw_degrees: u16,
    pub scan_strategy: &'static str,
    pub max_boxes_per_unit: u32,
    pub volume_rate: f64,
    pub weight_rate: f64,
    pub blocked_positions: u32,
    pub layout_score: f64,
    pub occupied_span_rate: f64,
    pub center_of_gravity_height_rate: f64,
    pub boundary_contact_count: u32,
    pub blocked_edge_contact_count: u32,
    pub rejection_summary: LoadingPlacementRejectionSummary,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingOrientation {
    pub label: &'static str,
    pub length_axis: &'static str,
    pub width_axis: &'static str,
    pub height_axis: &'static str,
    pub yaw_degrees: u16,
    pub equivalent_yaw_degrees: &'static [u16],
    pub dimension: DimensionsMm,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingGrid {
    pub boxes_along_length: u32,
    pub boxes_along_width: u32,
    pub layer_count: u32,
    pub boxes_per_layer: u32,
    pub available_positions: u32,
    pub blocked_positions: u32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingUtilization {
    pub volume_rate: f64,
    pub weight_rate: f64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingPlacement {
    pub package_index: u32,
    pub layer_index: u32,
    pub row_index: u32,
    pub column_index: u32,
    pub position_mm: PositionMm,
    pub dimension: DimensionsMm,
    pub orientation_label: &'static str,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PositionMm {
    pub x_mm: u32,
    pub y_mm: u32,
    pub z_mm: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LoadingWarning {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum VehicleLoadingError {
    InvalidRequestSchema {
        expected: &'static str,
        actual: String,
    },
    VehicleIDRequired,
    PackageIDRequired,
    VehicleSpaceInvalid,
    VehiclePayloadInvalid,
    PackageQuantityInvalid,
    PackageDimensionInvalid,
    PackageWeightInvalid,
    BlockedSpaceInvalid(String),
    PlacementOutputLimitInvalid,
    GridCellScanLimitInvalid,
    GridCellScanLimitExceeded {
        actual: u32,
        maximum: u32,
    },
    PackageCannotFit,
    PlacementOutputLimitExceeded {
        actual: u32,
        maximum: u32,
    },
    GeneratedPlacementInvalid(String),
}

impl Display for VehicleLoadingError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidRequestSchema { expected, actual } => write!(
                formatter,
                "装箱请求协议必须是 {}，当前为 {}",
                expected, actual
            ),
            Self::VehicleIDRequired => write!(formatter, "装载空间 ID 不能为空"),
            Self::PackageIDRequired => write!(formatter, "包装 ID 不能为空"),
            Self::VehicleSpaceInvalid => write!(formatter, "装载空间尺寸必须大于 0"),
            Self::VehiclePayloadInvalid => write!(formatter, "装载空间承重必须大于 0"),
            Self::PackageQuantityInvalid => write!(formatter, "箱数必须大于 0"),
            Self::PackageDimensionInvalid => write!(formatter, "箱体尺寸必须大于 0"),
            Self::PackageWeightInvalid => write!(formatter, "单箱重量必须大于 0"),
            Self::BlockedSpaceInvalid(reason) => write!(formatter, "障碍区无效: {}", reason),
            Self::PlacementOutputLimitInvalid => write!(formatter, "摆放输出上限必须大于 0"),
            Self::GridCellScanLimitInvalid => write!(formatter, "格位扫描上限必须大于 0"),
            Self::GridCellScanLimitExceeded { actual, maximum } => write!(
                formatter,
                "装箱候选锚点扫描数量 {} 超过上限 {}，请增大箱体尺寸或提高受控上限",
                actual, maximum
            ),
            Self::PackageCannotFit => {
                write!(formatter, "当前箱体在所有允许朝向下都无法放入装载空间")
            }
            Self::PlacementOutputLimitExceeded { actual, maximum } => write!(
                formatter,
                "摆放数量 {} 超过输出上限 {}，请减少箱数或提高受控上限",
                actual, maximum
            ),
            Self::GeneratedPlacementInvalid(reason) => {
                write!(formatter, "引擎生成的摆放方案无效: {}", reason)
            }
        }
    }
}

impl std::error::Error for VehicleLoadingError {}

#[derive(Debug, Clone)]
struct CandidatePlan {
    orientation: LoadingOrientation,
    grid: LoadingGrid,
    scan_strategy: AnchorScanStrategy,
    evaluated_orientation_count: u32,
    max_boxes_per_unit: u32,
    volume_rate: f64,
    weight_rate: f64,
    layout_quality: LayoutQuality,
    placements: Vec<LoadingPlacement>,
    rejection_summary: LoadingPlacementRejectionSummary,
}

#[derive(Debug, Clone)]
struct CandidateSearchResult {
    best: Option<CandidatePlan>,
    summaries: Vec<LoadingCandidateSummary>,
}

#[derive(Debug, Clone, Copy)]
struct CandidateAnchorPosition {
    layer_index: u32,
    row_index: u32,
    column_index: u32,
    origin_mm: PositionMm,
}

#[derive(Debug, Clone)]
struct GreedyPlacementResult {
    scan_strategy: AnchorScanStrategy,
    layout_quality: LayoutQuality,
    placements: Vec<LoadingPlacement>,
    rejection_summary: LoadingPlacementRejectionSummary,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PlacementRejectionReason {
    Boundary,
    BlockedSpace,
    Collision,
    Support,
}

impl Default for LoadingPlacementRejectionSummary {
    fn default() -> Self {
        Self {
            evaluated_anchor_count: 0,
            accepted_anchor_count: 0,
            boundary_rejection_count: 0,
            blocked_space_rejection_count: 0,
            collision_rejection_count: 0,
            support_rejection_count: 0,
            first_collision_witness: None,
        }
    }
}

impl LoadingPlacementRejectionSummary {
    fn record_acceptance(&mut self) {
        self.evaluated_anchor_count = self.evaluated_anchor_count.saturating_add(1);
        self.accepted_anchor_count = self.accepted_anchor_count.saturating_add(1);
    }

    fn record_rejection(&mut self, rejection: &PlacementRejection) {
        self.evaluated_anchor_count = self.evaluated_anchor_count.saturating_add(1);
        match rejection.reason {
            PlacementRejectionReason::Boundary => {
                self.boundary_rejection_count = self.boundary_rejection_count.saturating_add(1);
            }
            PlacementRejectionReason::BlockedSpace => {
                self.blocked_space_rejection_count =
                    self.blocked_space_rejection_count.saturating_add(1);
            }
            PlacementRejectionReason::Collision => {
                self.collision_rejection_count = self.collision_rejection_count.saturating_add(1);
            }
            PlacementRejectionReason::Support => {
                self.support_rejection_count = self.support_rejection_count.saturating_add(1);
            }
        }
        if self.first_collision_witness.is_none() {
            self.first_collision_witness = rejection.witness.clone();
        }
    }
}

struct PlacementRejection {
    reason: PlacementRejectionReason,
    witness: Option<LoadingCollisionWitness>,
}

#[derive(Debug, Clone, Copy)]
struct LayoutQuality {
    layout_score: f64,
    occupied_span_rate: f64,
    center_of_gravity_height_rate: f64,
    boundary_contact_count: u32,
    blocked_edge_contact_count: u32,
    occupied_span_volume_mm3: u128,
    center_of_gravity_height_sum_twice_mm: u128,
}

#[derive(Debug, Clone, Copy)]
enum HorizontalSupportSurface {
    AxisAligned {
        origin_mm: PositionMm,
        dimension: DimensionsMm,
    },
    OrientedTop {
        center_mm: [f64; 2],
        half_extents_mm: [f64; 2],
        axes: [[f64; 2]; 2],
    },
}

#[derive(Debug, Clone, Copy)]
enum AnchorScanStrategy {
    LayerRowColumn,
    LayerColumnRow,
    LayerRowReverseColumn,
    LayerReverseRowColumn,
    LayerReverseRowReverseColumn,
    LayerReverseColumnReverseRow,
}

impl AnchorScanStrategy {
    fn label(self) -> &'static str {
        match self {
            Self::LayerRowColumn => "layer-row-column",
            Self::LayerColumnRow => "layer-column-row",
            Self::LayerRowReverseColumn => "layer-row-reverse-column",
            Self::LayerReverseRowColumn => "layer-reverse-row-column",
            Self::LayerReverseRowReverseColumn => "layer-reverse-row-reverse-column",
            Self::LayerReverseColumnReverseRow => "layer-reverse-column-reverse-row",
        }
    }
}

const ANCHOR_SCAN_STRATEGIES: &[AnchorScanStrategy] = &[
    AnchorScanStrategy::LayerRowColumn,
    AnchorScanStrategy::LayerColumnRow,
    AnchorScanStrategy::LayerRowReverseColumn,
    AnchorScanStrategy::LayerReverseRowColumn,
    AnchorScanStrategy::LayerReverseRowReverseColumn,
    AnchorScanStrategy::LayerReverseColumnReverseRow,
];

pub fn plan_loading_space(
    request: &LoadingSpacePlanRequest,
) -> Result<LoadingSpacePlan, VehicleLoadingError> {
    validate_loading_space_plan_request(request)?;

    let max_placement_output = request
        .limits
        .as_ref()
        .and_then(|limits| limits.max_placement_output)
        .unwrap_or(DEFAULT_MAX_PLACEMENT_OUTPUT);
    if max_placement_output == 0 {
        return Err(VehicleLoadingError::PlacementOutputLimitInvalid);
    }

    let candidate_search = build_best_candidate_plan(request)?;
    let candidate = candidate_search
        .best
        .ok_or(VehicleLoadingError::PackageCannotFit)?;
    let boxes_placed = request.package.quantity.min(candidate.max_boxes_per_unit);
    if boxes_placed > max_placement_output {
        return Err(VehicleLoadingError::PlacementOutputLimitExceeded {
            actual: boxes_placed,
            maximum: max_placement_output,
        });
    }

    let remaining_boxes = request.package.quantity.saturating_sub(boxes_placed);
    let units_needed = ceil_div_u32(request.package.quantity, candidate.max_boxes_per_unit);
    let placements = candidate
        .placements
        .iter()
        .take(boxes_placed as usize)
        .cloned()
        .collect();

    Ok(LoadingSpacePlan {
        schema_version: LOADING_SPACE_PLAN_SCHEMA_VERSION.to_owned(),
        engine_version: LOADING_SPACE_ENGINE_VERSION.to_owned(),
        loading_space_id: request.loading_space.id.clone(),
        package_id: request.package.id.clone(),
        requested_boxes: request.package.quantity,
        boxes_placed_in_preview_unit: boxes_placed,
        remaining_boxes_after_preview_unit: remaining_boxes,
        max_boxes_per_unit: candidate.max_boxes_per_unit,
        units_needed,
        selected_orientation: candidate.orientation,
        grid: candidate.grid,
        utilization: VehicleLoadingUtilization {
            volume_rate: candidate.volume_rate,
            weight_rate: candidate.weight_rate,
        },
        search: LoadingSearchSummary {
            evaluated_orientation_count: candidate.evaluated_orientation_count,
            evaluated_scan_strategy_count: ANCHOR_SCAN_STRATEGIES.len().min(u32::MAX as usize)
                as u32,
            selected_scan_strategy: candidate.scan_strategy.label(),
            candidate_summaries: candidate_search.summaries,
        },
        placements,
        warnings: build_loading_space_plan_warnings(request, &candidate, remaining_boxes),
    })
}

pub fn diagnose_loading_space_plan(
    request: &LoadingSpacePlanRequest,
) -> Result<LoadingPlanDiagnostics, VehicleLoadingError> {
    validate_loading_space_plan_request(request)?;
    build_loading_plan_diagnostics(request)
}

pub fn diagnose_vehicle_loading_plan(
    request: &VehicleLoadingPlanRequest,
) -> Result<VehicleLoadingPlanDiagnostics, VehicleLoadingError> {
    if request.schema_version != VEHICLE_LOADING_REQUEST_SCHEMA_VERSION {
        return Err(VehicleLoadingError::InvalidRequestSchema {
            expected: VEHICLE_LOADING_REQUEST_SCHEMA_VERSION,
            actual: request.schema_version.clone(),
        });
    }

    diagnose_loading_space_plan(&loading_space_request_from_vehicle_request(request))
}

fn build_loading_plan_diagnostics(
    request: &LoadingSpacePlanRequest,
) -> Result<LoadingPlanDiagnostics, VehicleLoadingError> {
    let orientations = get_vehicle_loading_orientations(
        request.package.dimension,
        request.package.can_rotate,
        request.package.can_invert,
    );
    let evaluated_orientation_count = orientations.len().min(u32::MAX as usize) as u32;
    let mut orientation_diagnostics = Vec::with_capacity(orientations.len());

    for orientation in orientations {
        orientation_diagnostics.push(build_loading_orientation_diagnostic(request, orientation)?);
    }

    let has_feasible_orientation = orientation_diagnostics
        .iter()
        .any(|diagnostic| diagnostic.status == "feasible");
    let failure_code = if has_feasible_orientation {
        "NONE"
    } else {
        "PACKAGE_CANNOT_FIT"
    };
    let failure_message = if has_feasible_orientation {
        "至少一个允许朝向存在可行摆放位置".to_owned()
    } else {
        VehicleLoadingError::PackageCannotFit.to_string()
    };

    Ok(LoadingPlanDiagnostics {
        schema_version: LOADING_PLAN_DIAGNOSTICS_SCHEMA_VERSION.to_owned(),
        engine_version: LOADING_SPACE_ENGINE_VERSION.to_owned(),
        loading_space_id: request.loading_space.id.clone(),
        package_id: request.package.id.clone(),
        failure_code: failure_code.to_owned(),
        failure_message,
        evaluated_orientation_count,
        evaluated_scan_strategy_count: ANCHOR_SCAN_STRATEGIES.len().min(u32::MAX as usize) as u32,
        orientations: orientation_diagnostics,
    })
}

fn build_loading_orientation_diagnostic(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
) -> Result<LoadingOrientationDiagnostic, VehicleLoadingError> {
    let loading_space = request.loading_space.usable_space;
    let dimension = orientation.dimension;
    let rejection_summary = LoadingPlacementRejectionSummary::default();
    let boundary_clearance_mm = boundary_clearance_mm(request);

    if !dimension_fits_with_horizontal_boundary_clearance(
        dimension,
        loading_space,
        boundary_clearance_mm,
    ) {
        return Ok(LoadingOrientationDiagnostic {
            orientation_label: orientation.label.to_owned(),
            yaw_degrees: orientation.yaw_degrees,
            dimension,
            status: "rejected".to_owned(),
            reason_code: "PACKAGE_HORIZONTAL_DIMENSION_EXCEEDS_LOADING_SPACE".to_owned(),
            reason_message: "箱体长度或宽度加上车厢边界安全间隙后超过可用空间".to_owned(),
            candidate_anchor_count: 0,
            max_boxes_by_geometry: 0,
            max_boxes_by_weight: max_boxes_by_weight(request),
            selected_scan_strategy: None,
            rejection_summary,
        });
    }
    if dimension.height_mm > loading_space.height_mm {
        return Ok(LoadingOrientationDiagnostic {
            orientation_label: orientation.label.to_owned(),
            yaw_degrees: orientation.yaw_degrees,
            dimension,
            status: "rejected".to_owned(),
            reason_code: "PACKAGE_HEIGHT_EXCEEDS_LOADING_SPACE".to_owned(),
            reason_message: "箱体高度超过可用空间高度".to_owned(),
            candidate_anchor_count: 0,
            max_boxes_by_geometry: 0,
            max_boxes_by_weight: max_boxes_by_weight(request),
            selected_scan_strategy: None,
            rejection_summary,
        });
    }

    let max_boxes_by_weight = max_boxes_by_weight(request);
    if max_boxes_by_weight == 0 {
        return Ok(LoadingOrientationDiagnostic {
            orientation_label: orientation.label.to_owned(),
            yaw_degrees: orientation.yaw_degrees,
            dimension,
            status: "rejected".to_owned(),
            reason_code: "PAYLOAD_CANNOT_CARRY_ONE_BOX".to_owned(),
            reason_message: "车型载重不足以承载一个箱体".to_owned(),
            candidate_anchor_count: 0,
            max_boxes_by_geometry: 0,
            max_boxes_by_weight,
            selected_scan_strategy: None,
            rejection_summary,
        });
    }

    let candidate_anchor_positions = build_candidate_anchor_positions(request, orientation)?;
    let greedy_result = build_best_greedy_anchor_placements(
        request,
        orientation,
        &candidate_anchor_positions,
        request.package.quantity.min(max_boxes_by_weight),
    );
    let max_boxes_by_geometry = greedy_result.placements.len().min(u32::MAX as usize) as u32;
    let has_feasible_placement = max_boxes_by_geometry > 0;

    Ok(LoadingOrientationDiagnostic {
        orientation_label: orientation.label.to_owned(),
        yaw_degrees: orientation.yaw_degrees,
        dimension,
        status: if has_feasible_placement {
            "feasible".to_owned()
        } else {
            "rejected".to_owned()
        },
        reason_code: if has_feasible_placement {
            "NONE".to_owned()
        } else {
            "NO_COLLISION_FREE_SUPPORTED_ANCHOR".to_owned()
        },
        reason_message: if has_feasible_placement {
            "至少找到一个通过边界、碰撞和水平支撑验收的候选锚点".to_owned()
        } else {
            "所有候选锚点都未通过边界、障碍碰撞、箱体互撞或水平支撑验收".to_owned()
        },
        candidate_anchor_count: candidate_anchor_positions.len().min(u32::MAX as usize) as u32,
        max_boxes_by_geometry,
        max_boxes_by_weight,
        selected_scan_strategy: Some(greedy_result.scan_strategy.label().to_owned()),
        rejection_summary: greedy_result.rejection_summary,
    })
}

pub fn plan_vehicle_loading(
    request: &VehicleLoadingPlanRequest,
) -> Result<VehicleLoadingPlan, VehicleLoadingError> {
    if request.schema_version != VEHICLE_LOADING_REQUEST_SCHEMA_VERSION {
        return Err(VehicleLoadingError::InvalidRequestSchema {
            expected: VEHICLE_LOADING_REQUEST_SCHEMA_VERSION,
            actual: request.schema_version.clone(),
        });
    }

    let loading_space_plan =
        plan_loading_space(&loading_space_request_from_vehicle_request(request))?;
    Ok(vehicle_plan_from_loading_space_plan(loading_space_plan))
}

fn loading_space_request_from_vehicle_request(
    request: &VehicleLoadingPlanRequest,
) -> LoadingSpacePlanRequest {
    LoadingSpacePlanRequest {
        schema_version: LOADING_SPACE_PLAN_REQUEST_SCHEMA_VERSION.to_owned(),
        loading_space: LoadingSpaceInput {
            id: request.vehicle.id.clone(),
            name: request.vehicle.name.clone(),
            usable_space: request.vehicle.usable_space,
            blocked_spaces: request.vehicle.blocked_spaces.clone(),
            payload_kg: request.vehicle.payload_kg,
        },
        package: request.package.clone(),
        limits: request.limits,
    }
}

fn vehicle_plan_from_loading_space_plan(plan: LoadingSpacePlan) -> VehicleLoadingPlan {
    VehicleLoadingPlan {
        schema_version: VEHICLE_LOADING_PLAN_SCHEMA_VERSION.to_owned(),
        engine_version: VEHICLE_LOADING_ENGINE_VERSION.to_owned(),
        vehicle_id: plan.loading_space_id,
        package_id: plan.package_id,
        requested_boxes: plan.requested_boxes,
        boxes_placed_in_preview_vehicle: plan.boxes_placed_in_preview_unit,
        remaining_boxes_after_preview_vehicle: plan.remaining_boxes_after_preview_unit,
        max_boxes_per_vehicle: plan.max_boxes_per_unit,
        vehicles_needed: plan.units_needed,
        selected_orientation: plan.selected_orientation,
        grid: plan.grid,
        utilization: plan.utilization,
        search: plan.search,
        placements: plan.placements,
        warnings: vehicle_warnings_from_loading_space_warnings(plan.warnings),
    }
}

fn vehicle_warnings_from_loading_space_warnings(
    warnings: Vec<LoadingWarning>,
) -> Vec<LoadingWarning> {
    warnings
        .into_iter()
        .map(|warning| match warning.code.as_str() {
            "MULTIPLE_LOADING_UNITS_REQUIRED" => LoadingWarning {
                code: "MULTIPLE_VEHICLES_REQUIRED".to_owned(),
                message: warning
                    .message
                    .replace("单个装载单元", "单车")
                    .replace("多个装载单元", "多车"),
            },
            "PREVIEW_SHOWS_FIRST_LOADING_UNIT_ONLY" => LoadingWarning {
                code: "PREVIEW_SHOWS_FIRST_VEHICLE_ONLY".to_owned(),
                message: warning.message.replace("第一个装载单元", "第一辆车"),
            },
            _ => warning,
        })
        .collect()
}

fn validate_loading_space_plan_request(
    request: &LoadingSpacePlanRequest,
) -> Result<(), VehicleLoadingError> {
    if request.schema_version != LOADING_SPACE_PLAN_REQUEST_SCHEMA_VERSION {
        return Err(VehicleLoadingError::InvalidRequestSchema {
            expected: LOADING_SPACE_PLAN_REQUEST_SCHEMA_VERSION,
            actual: request.schema_version.clone(),
        });
    }
    if request.loading_space.id.trim().is_empty() {
        return Err(VehicleLoadingError::VehicleIDRequired);
    }
    if request.package.id.trim().is_empty() {
        return Err(VehicleLoadingError::PackageIDRequired);
    }
    if !dimensions_are_positive(request.loading_space.usable_space) {
        return Err(VehicleLoadingError::VehicleSpaceInvalid);
    }
    if !positive_finite(request.loading_space.payload_kg) {
        return Err(VehicleLoadingError::VehiclePayloadInvalid);
    }
    if request.package.quantity == 0 {
        return Err(VehicleLoadingError::PackageQuantityInvalid);
    }
    if !dimensions_are_positive(request.package.dimension) {
        return Err(VehicleLoadingError::PackageDimensionInvalid);
    }
    if !positive_finite(request.package.unit_weight_kg) {
        return Err(VehicleLoadingError::PackageWeightInvalid);
    }
    if request
        .limits
        .as_ref()
        .and_then(|limits| limits.max_placement_output)
        == Some(0)
    {
        return Err(VehicleLoadingError::PlacementOutputLimitInvalid);
    }
    if request
        .limits
        .as_ref()
        .and_then(|limits| limits.max_grid_cell_scan)
        == Some(0)
    {
        return Err(VehicleLoadingError::GridCellScanLimitInvalid);
    }
    validate_blocked_spaces(request)?;
    Ok(())
}

fn validate_blocked_spaces(request: &LoadingSpacePlanRequest) -> Result<(), VehicleLoadingError> {
    let Some(blocked_spaces) = &request.loading_space.blocked_spaces else {
        return Ok(());
    };
    for blocked_space in blocked_spaces {
        if blocked_space.id.trim().is_empty() {
            return Err(VehicleLoadingError::BlockedSpaceInvalid(
                "id 不能为空".to_owned(),
            ));
        }
        if blocked_space.kind.trim().is_empty() {
            return Err(VehicleLoadingError::BlockedSpaceInvalid(
                "kind 不能为空".to_owned(),
            ));
        }
        if !dimensions_are_positive(blocked_space.dimension) {
            return Err(VehicleLoadingError::BlockedSpaceInvalid(
                "dimension 必须大于 0".to_owned(),
            ));
        }
        if !aabb_is_inside_loading_space(
            blocked_space.origin_mm,
            blocked_space.dimension,
            request.loading_space.usable_space,
        ) {
            return Err(VehicleLoadingError::BlockedSpaceInvalid(format!(
                "{} 必须位于装载空间内部",
                blocked_space.id
            )));
        }
        if let Some(obb) = &blocked_space.obb {
            validate_obb_input(obb).map_err(|reason| {
                VehicleLoadingError::BlockedSpaceInvalid(format!(
                    "{} 的 OBB 无效: {}",
                    blocked_space.id, reason
                ))
            })?;
            validate_blocked_space_obb_envelope(blocked_space).map_err(|reason| {
                VehicleLoadingError::BlockedSpaceInvalid(format!(
                    "{} 的 OBB 无效: {}",
                    blocked_space.id, reason
                ))
            })?;
        }
    }
    Ok(())
}

fn validate_obb_input(obb: &LoadingSpaceObbInput) -> Result<(), &'static str> {
    if obb.center_mm.iter().any(|value| !value.is_finite()) {
        return Err("center 必须是有限数字");
    }
    if obb
        .half_extents_mm
        .iter()
        .any(|value| !value.is_finite() || *value <= 0.0)
    {
        return Err("halfExtents 必须是大于 0 的有限数字");
    }
    for axis in obb.axes {
        let length = vector_dot(axis, axis).sqrt();
        if !length.is_finite() || (length - 1.0).abs() > 0.0001 {
            return Err("axes 必须是单位向量");
        }
    }
    for left_index in 0..3 {
        for right_index in (left_index + 1)..3 {
            if vector_dot(obb.axes[left_index], obb.axes[right_index]).abs() > 0.0001 {
                return Err("axes 必须相互正交");
            }
        }
    }
    Ok(())
}

fn validate_blocked_space_obb_envelope(
    blocked_space: &LoadingSpaceBlockedSpaceInput,
) -> Result<(), &'static str> {
    let Some(obb) = &blocked_space.obb else {
        return Ok(());
    };
    let (obb_min_mm, obb_max_mm) = obb_broad_aabb_mm(obb);
    let envelope_min_mm = [
        blocked_space.origin_mm.x_mm as f64,
        blocked_space.origin_mm.y_mm as f64,
        blocked_space.origin_mm.z_mm as f64,
    ];
    let envelope_max_mm = [
        blocked_space.origin_mm.x_mm as f64 + blocked_space.dimension.length_mm as f64,
        blocked_space.origin_mm.y_mm as f64 + blocked_space.dimension.width_mm as f64,
        blocked_space.origin_mm.z_mm as f64 + blocked_space.dimension.height_mm as f64,
    ];
    for axis_index in 0..3 {
        if obb_min_mm[axis_index] + OBB_ENVELOPE_TOLERANCE_MM < envelope_min_mm[axis_index]
            || obb_max_mm[axis_index] - OBB_ENVELOPE_TOLERANCE_MM > envelope_max_mm[axis_index]
        {
            return Err("broad AABB 必须位于 blockedSpace envelope 内");
        }
    }
    Ok(())
}

fn obb_broad_aabb_mm(obb: &LoadingSpaceObbInput) -> ([f64; 3], [f64; 3]) {
    let mut radius_mm = [0.0; 3];
    for axis_index in 0..3 {
        for (world_axis_index, radius) in radius_mm.iter_mut().enumerate() {
            *radius +=
                obb.half_extents_mm[axis_index] * obb.axes[axis_index][world_axis_index].abs();
        }
    }
    (
        [
            obb.center_mm[0] - radius_mm[0],
            obb.center_mm[1] - radius_mm[1],
            obb.center_mm[2] - radius_mm[2],
        ],
        [
            obb.center_mm[0] + radius_mm[0],
            obb.center_mm[1] + radius_mm[1],
            obb.center_mm[2] + radius_mm[2],
        ],
    )
}

fn dimensions_are_positive(dimensions: DimensionsMm) -> bool {
    dimensions.length_mm > 0 && dimensions.width_mm > 0 && dimensions.height_mm > 0
}

fn dimension_fits_with_horizontal_boundary_clearance(
    dimension: DimensionsMm,
    loading_space: DimensionsMm,
    boundary_clearance_mm: u32,
) -> bool {
    let horizontal_clearance_twice = boundary_clearance_mm.saturating_mul(2);
    dimension
        .length_mm
        .saturating_add(horizontal_clearance_twice)
        <= loading_space.length_mm
        && dimension
            .width_mm
            .saturating_add(horizontal_clearance_twice)
            <= loading_space.width_mm
}

fn axis_slot_count_with_clearance(
    container_size_mm: u32,
    item_size_mm: u32,
    clearance_mm: u32,
    boundary_clearance_mm: u32,
) -> u32 {
    if item_size_mm == 0 {
        return 0;
    }
    let effective_size_mm =
        container_size_mm.saturating_sub(boundary_clearance_mm.saturating_mul(2));
    if effective_size_mm < item_size_mm {
        return 0;
    }
    let step_mm = item_size_mm.saturating_add(clearance_mm).max(1);
    effective_size_mm.saturating_sub(item_size_mm) / step_mm + 1
}

fn positive_finite(value: f64) -> bool {
    value.is_finite() && value > 0.0
}

fn max_grid_cell_scan(request: &LoadingSpacePlanRequest) -> u32 {
    request
        .limits
        .as_ref()
        .and_then(|limits| limits.max_grid_cell_scan)
        .unwrap_or(DEFAULT_MAX_GRID_CELL_SCAN)
}

fn collision_clearance_mm(request: &LoadingSpacePlanRequest) -> u32 {
    request
        .limits
        .as_ref()
        .and_then(|limits| limits.collision_clearance_mm)
        .unwrap_or(0)
}

fn boundary_clearance_mm(request: &LoadingSpacePlanRequest) -> u32 {
    request
        .limits
        .as_ref()
        .and_then(|limits| limits.boundary_clearance_mm)
        .unwrap_or(0)
}

fn max_boxes_by_weight(request: &LoadingSpacePlanRequest) -> u32 {
    (request.loading_space.payload_kg / request.package.unit_weight_kg).floor() as u32
}

fn build_best_candidate_plan(
    request: &LoadingSpacePlanRequest,
) -> Result<CandidateSearchResult, VehicleLoadingError> {
    let orientations = get_vehicle_loading_orientations(
        request.package.dimension,
        request.package.can_rotate,
        request.package.can_invert,
    );
    let evaluated_orientation_count = orientations.len().min(u32::MAX as usize) as u32;
    let mut best: Option<CandidatePlan> = None;
    let mut summaries = Vec::new();
    for orientation in orientations {
        let Some(mut candidate) = build_candidate_plan_for_orientation(request, orientation)?
        else {
            continue;
        };
        candidate.evaluated_orientation_count = evaluated_orientation_count;
        summaries.push(build_loading_candidate_summary(&candidate));
        if best
            .as_ref()
            .is_none_or(|current| candidate_is_better(&candidate, current))
        {
            best = Some(candidate);
        }
    }
    Ok(CandidateSearchResult { best, summaries })
}

fn build_loading_candidate_summary(candidate: &CandidatePlan) -> LoadingCandidateSummary {
    LoadingCandidateSummary {
        orientation_label: candidate.orientation.label,
        yaw_degrees: candidate.orientation.yaw_degrees,
        scan_strategy: candidate.scan_strategy.label(),
        max_boxes_per_unit: candidate.max_boxes_per_unit,
        volume_rate: candidate.volume_rate,
        weight_rate: candidate.weight_rate,
        blocked_positions: candidate.grid.blocked_positions,
        layout_score: candidate.layout_quality.layout_score,
        occupied_span_rate: candidate.layout_quality.occupied_span_rate,
        center_of_gravity_height_rate: candidate.layout_quality.center_of_gravity_height_rate,
        boundary_contact_count: candidate.layout_quality.boundary_contact_count,
        blocked_edge_contact_count: candidate.layout_quality.blocked_edge_contact_count,
        rejection_summary: candidate.rejection_summary.clone(),
    }
}

fn build_candidate_plan_for_orientation(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
) -> Result<Option<CandidatePlan>, VehicleLoadingError> {
    let loading_space = request.loading_space.usable_space;
    let package_dimension = orientation.dimension;
    let boundary_clearance_mm = boundary_clearance_mm(request);
    if !dimension_fits_with_horizontal_boundary_clearance(
        package_dimension,
        loading_space,
        boundary_clearance_mm,
    ) || package_dimension.height_mm > loading_space.height_mm
    {
        return Ok(None);
    }

    let collision_clearance_mm = collision_clearance_mm(request);
    let boxes_along_length = axis_slot_count_with_clearance(
        loading_space.length_mm,
        package_dimension.length_mm,
        collision_clearance_mm,
        boundary_clearance_mm,
    );
    let boxes_along_width = axis_slot_count_with_clearance(
        loading_space.width_mm,
        package_dimension.width_mm,
        collision_clearance_mm,
        boundary_clearance_mm,
    );
    let layer_count = loading_space.height_mm / package_dimension.height_mm;
    let boxes_per_layer = boxes_along_length.checked_mul(boxes_along_width).ok_or(
        VehicleLoadingError::GridCellScanLimitExceeded {
            actual: u32::MAX,
            maximum: max_grid_cell_scan(request),
        },
    )?;
    let max_boxes_by_weight = max_boxes_by_weight(request);
    let score_limit = request.package.quantity.min(max_boxes_by_weight);
    let candidate_anchor_positions = build_candidate_anchor_positions(request, orientation)?;
    let greedy_result = build_best_greedy_anchor_placements(
        request,
        orientation,
        &candidate_anchor_positions,
        score_limit,
    );
    let available_positions = greedy_result.placements.len().min(u32::MAX as usize) as u32;
    let blocked_positions = (candidate_anchor_positions.len().min(u32::MAX as usize) as u32)
        .saturating_sub(available_positions);
    let max_boxes_per_unit = available_positions.min(max_boxes_by_weight);
    if max_boxes_per_unit == 0 {
        return Ok(None);
    }

    let loaded_volume = package_dimension.volume_mm3() * max_boxes_per_unit as u128;
    let loading_space_volume = loading_space.volume_mm3();
    let volume_rate = if loading_space_volume > 0 {
        (loaded_volume as f64 / loading_space_volume as f64).min(1.0)
    } else {
        0.0
    };
    let weight_rate = ((max_boxes_per_unit as f64 * request.package.unit_weight_kg)
        / request.loading_space.payload_kg)
        .min(1.0);

    let placements = greedy_result
        .placements
        .into_iter()
        .take(max_boxes_per_unit as usize)
        .collect::<Vec<_>>();
    validate_generated_placements(request, orientation, &placements)
        .map_err(VehicleLoadingError::GeneratedPlacementInvalid)?;

    Ok(Some(CandidatePlan {
        orientation,
        grid: LoadingGrid {
            boxes_along_length,
            boxes_along_width,
            layer_count,
            boxes_per_layer,
            available_positions,
            blocked_positions,
        },
        scan_strategy: greedy_result.scan_strategy,
        evaluated_orientation_count: 0,
        max_boxes_per_unit,
        volume_rate,
        weight_rate,
        layout_quality: greedy_result.layout_quality,
        placements,
        rejection_summary: greedy_result.rejection_summary,
    }))
}

fn candidate_is_better(candidate: &CandidatePlan, current: &CandidatePlan) -> bool {
    compare_u32(candidate.max_boxes_per_unit, current.max_boxes_per_unit)
        .then_with(|| compare_layout_quality(&candidate.layout_quality, &current.layout_quality))
        .then_with(|| compare_f64(candidate.volume_rate, current.volume_rate))
        .then_with(|| compare_f64(candidate.weight_rate, current.weight_rate))
        .then_with(|| compare_u32(candidate.grid.boxes_per_layer, current.grid.boxes_per_layer))
        == Ordering::Greater
}

fn compare_layout_quality(candidate: &LayoutQuality, current: &LayoutQuality) -> Ordering {
    compare_f64(candidate.layout_score, current.layout_score)
        .then_with(|| {
            current
                .occupied_span_volume_mm3
                .cmp(&candidate.occupied_span_volume_mm3)
        })
        .then_with(|| {
            current
                .center_of_gravity_height_sum_twice_mm
                .cmp(&candidate.center_of_gravity_height_sum_twice_mm)
        })
        .then_with(|| {
            candidate
                .blocked_edge_contact_count
                .cmp(&current.blocked_edge_contact_count)
        })
        .then_with(|| {
            candidate
                .boundary_contact_count
                .cmp(&current.boundary_contact_count)
        })
}

fn compare_u32(left: u32, right: u32) -> Ordering {
    left.cmp(&right)
}

fn compare_f64(left: f64, right: f64) -> Ordering {
    left.partial_cmp(&right).unwrap_or(Ordering::Equal)
}

fn get_vehicle_loading_orientations(
    dimension: DimensionsMm,
    can_rotate: bool,
    can_invert: bool,
) -> Vec<LoadingOrientation> {
    if !can_rotate {
        return vec![LoadingOrientation {
            label: "L-W-H",
            length_axis: "length",
            width_axis: "width",
            height_axis: "height",
            yaw_degrees: 0,
            equivalent_yaw_degrees: YAW_0,
            dimension,
        }];
    }

    let mut orientations = vec![
        LoadingOrientation {
            label: "L-W-H",
            length_axis: "length",
            width_axis: "width",
            height_axis: "height",
            yaw_degrees: 0,
            equivalent_yaw_degrees: YAW_0_180,
            dimension,
        },
        LoadingOrientation {
            label: "W-L-H",
            length_axis: "width",
            width_axis: "length",
            height_axis: "height",
            yaw_degrees: 90,
            equivalent_yaw_degrees: YAW_90_270,
            dimension: DimensionsMm {
                length_mm: dimension.width_mm,
                width_mm: dimension.length_mm,
                height_mm: dimension.height_mm,
            },
        },
    ];

    if can_invert {
        orientations.extend([
            LoadingOrientation {
                label: "L-H-W",
                length_axis: "length",
                width_axis: "height",
                height_axis: "width",
                yaw_degrees: 0,
                equivalent_yaw_degrees: YAW_0_180,
                dimension: DimensionsMm {
                    length_mm: dimension.length_mm,
                    width_mm: dimension.height_mm,
                    height_mm: dimension.width_mm,
                },
            },
            LoadingOrientation {
                label: "W-H-L",
                length_axis: "width",
                width_axis: "height",
                height_axis: "length",
                yaw_degrees: 90,
                equivalent_yaw_degrees: YAW_90_270,
                dimension: DimensionsMm {
                    length_mm: dimension.width_mm,
                    width_mm: dimension.height_mm,
                    height_mm: dimension.length_mm,
                },
            },
            LoadingOrientation {
                label: "H-L-W",
                length_axis: "height",
                width_axis: "length",
                height_axis: "width",
                yaw_degrees: 0,
                equivalent_yaw_degrees: YAW_0_180,
                dimension: DimensionsMm {
                    length_mm: dimension.height_mm,
                    width_mm: dimension.length_mm,
                    height_mm: dimension.width_mm,
                },
            },
            LoadingOrientation {
                label: "H-W-L",
                length_axis: "height",
                width_axis: "width",
                height_axis: "length",
                yaw_degrees: 0,
                equivalent_yaw_degrees: YAW_0_180,
                dimension: DimensionsMm {
                    length_mm: dimension.height_mm,
                    width_mm: dimension.width_mm,
                    height_mm: dimension.length_mm,
                },
            },
        ]);
    }

    dedupe_orientations(orientations)
}

fn dedupe_orientations(items: Vec<LoadingOrientation>) -> Vec<LoadingOrientation> {
    let mut result = Vec::with_capacity(items.len());
    for item in items {
        if result
            .iter()
            .any(|existing: &LoadingOrientation| existing.dimension == item.dimension)
        {
            continue;
        }
        result.push(item);
    }
    result
}

fn build_candidate_anchor_positions(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
) -> Result<Vec<CandidateAnchorPosition>, VehicleLoadingError> {
    let loading_space = request.loading_space.usable_space;
    let dimension = orientation.dimension;
    let blocked_spaces = normalized_blocked_spaces(request);
    let x_anchors = build_axis_anchor_values(
        loading_space.length_mm,
        dimension.length_mm,
        collision_clearance_mm(request),
        boundary_clearance_mm(request),
        blocked_spaces.iter().flat_map(|blocked_space| {
            blocked_space_axis_anchor_intervals(blocked_space, LoadingAxis::Length)
        }),
    );
    let y_anchors = build_axis_anchor_values(
        loading_space.width_mm,
        dimension.width_mm,
        collision_clearance_mm(request),
        boundary_clearance_mm(request),
        blocked_spaces.iter().flat_map(|blocked_space| {
            blocked_space_axis_anchor_intervals(blocked_space, LoadingAxis::Width)
        }),
    );
    let z_anchors = build_axis_anchor_values(
        loading_space.height_mm,
        dimension.height_mm,
        0,
        0,
        blocked_spaces.iter().flat_map(|blocked_space| {
            blocked_space_axis_anchor_intervals(blocked_space, LoadingAxis::Height)
        }),
    );
    let actual = checked_anchor_position_count(&x_anchors, &y_anchors, &z_anchors)?;
    let maximum = max_grid_cell_scan(request);
    if actual > maximum {
        return Err(VehicleLoadingError::GridCellScanLimitExceeded { actual, maximum });
    }

    let mut positions = Vec::with_capacity(actual as usize);
    for (layer_index, z_mm) in z_anchors.iter().enumerate() {
        for (row_index, y_mm) in y_anchors.iter().enumerate() {
            for (column_index, x_mm) in x_anchors.iter().enumerate() {
                positions.push(CandidateAnchorPosition {
                    layer_index: layer_index as u32,
                    row_index: row_index as u32,
                    column_index: column_index as u32,
                    origin_mm: PositionMm {
                        x_mm: *x_mm,
                        y_mm: *y_mm,
                        z_mm: *z_mm,
                    },
                });
            }
        }
    }
    Ok(positions)
}

#[derive(Debug, Clone, Copy)]
enum LoadingAxis {
    Length,
    Width,
    Height,
}

impl LoadingAxis {
    fn index(self) -> usize {
        match self {
            LoadingAxis::Length => 0,
            LoadingAxis::Width => 1,
            LoadingAxis::Height => 2,
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct AxisAnchorIntervalMm {
    start_mm: f64,
    end_mm: f64,
}

fn blocked_space_axis_anchor_intervals(
    blocked_space: &LoadingSpaceBlockedSpaceInput,
    axis: LoadingAxis,
) -> Vec<AxisAnchorIntervalMm> {
    let mut intervals = vec![blocked_space_axis_anchor_interval(blocked_space, axis)];
    if let Some(obb) = &blocked_space.obb {
        intervals.extend(obb_corner_axis_coordinates_mm(obb, axis).into_iter().map(
            |coordinate_mm| AxisAnchorIntervalMm {
                start_mm: coordinate_mm,
                end_mm: coordinate_mm,
            },
        ));
    }
    intervals
}

fn blocked_space_axis_anchor_interval(
    blocked_space: &LoadingSpaceBlockedSpaceInput,
    axis: LoadingAxis,
) -> AxisAnchorIntervalMm {
    if let Some(obb) = &blocked_space.obb {
        let (min_mm, max_mm) = obb_broad_aabb_mm(obb);
        let axis_index = axis.index();
        return AxisAnchorIntervalMm {
            start_mm: min_mm[axis_index],
            end_mm: max_mm[axis_index],
        };
    }

    let (start_mm, size_mm) = match axis {
        LoadingAxis::Length => (
            blocked_space.origin_mm.x_mm,
            blocked_space.dimension.length_mm,
        ),
        LoadingAxis::Width => (
            blocked_space.origin_mm.y_mm,
            blocked_space.dimension.width_mm,
        ),
        LoadingAxis::Height => (
            blocked_space.origin_mm.z_mm,
            blocked_space.dimension.height_mm,
        ),
    };
    AxisAnchorIntervalMm {
        start_mm: start_mm as f64,
        end_mm: start_mm as f64 + size_mm as f64,
    }
}

fn obb_corner_axis_coordinates_mm(obb: &LoadingSpaceObbInput, axis: LoadingAxis) -> [f64; 8] {
    let axis_index = axis.index();
    let mut coordinates = [0.0; 8];
    let mut coordinate_index = 0;
    for first_sign in [-1.0, 1.0] {
        for second_sign in [-1.0, 1.0] {
            for third_sign in [-1.0, 1.0] {
                coordinates[coordinate_index] = obb.center_mm[axis_index]
                    + first_sign * obb.half_extents_mm[0] * obb.axes[0][axis_index]
                    + second_sign * obb.half_extents_mm[1] * obb.axes[1][axis_index]
                    + third_sign * obb.half_extents_mm[2] * obb.axes[2][axis_index];
                coordinate_index += 1;
            }
        }
    }
    coordinates
}

fn build_axis_anchor_values(
    container_size_mm: u32,
    item_size_mm: u32,
    clearance_mm: u32,
    boundary_clearance_mm: u32,
    blocked_intervals: impl Iterator<Item = AxisAnchorIntervalMm>,
) -> Vec<u32> {
    let min_origin = boundary_clearance_mm;
    let max_origin = container_size_mm
        .saturating_sub(item_size_mm)
        .saturating_sub(boundary_clearance_mm);
    let mut values = Vec::new();
    let mut current = min_origin;
    let step = item_size_mm.saturating_add(clearance_mm).max(1);

    while current <= max_origin {
        values.push(current);
        let Some(next) = current.checked_add(step) else {
            break;
        };
        if next == current {
            break;
        }
        current = next;
    }

    values.push(max_origin);
    for blocked_interval in blocked_intervals {
        if !blocked_interval.start_mm.is_finite()
            || !blocked_interval.end_mm.is_finite()
            || blocked_interval.end_mm < blocked_interval.start_mm
        {
            continue;
        }
        push_axis_anchor_if_in_range(
            &mut values,
            (blocked_interval.start_mm - item_size_mm as f64 - clearance_mm as f64).floor(),
            min_origin,
            max_origin,
        );
        push_axis_anchor_if_in_range(
            &mut values,
            (blocked_interval.end_mm + clearance_mm as f64).ceil(),
            min_origin,
            max_origin,
        );
    }

    values.sort_unstable();
    values.dedup();
    values
}

fn push_axis_anchor_if_in_range(
    values: &mut Vec<u32>,
    anchor_mm: f64,
    min_origin: u32,
    max_origin: u32,
) {
    if !anchor_mm.is_finite() || anchor_mm < min_origin as f64 || anchor_mm > max_origin as f64 {
        return;
    }
    values.push(anchor_mm as u32);
}

fn checked_anchor_position_count(
    x_anchors: &[u32],
    y_anchors: &[u32],
    z_anchors: &[u32],
) -> Result<u32, VehicleLoadingError> {
    let count = x_anchors
        .len()
        .checked_mul(y_anchors.len())
        .and_then(|value| value.checked_mul(z_anchors.len()))
        .ok_or(VehicleLoadingError::GridCellScanLimitExceeded {
            actual: u32::MAX,
            maximum: DEFAULT_MAX_GRID_CELL_SCAN,
        })?;
    u32::try_from(count).map_err(|_| VehicleLoadingError::GridCellScanLimitExceeded {
        actual: u32::MAX,
        maximum: DEFAULT_MAX_GRID_CELL_SCAN,
    })
}

fn build_best_greedy_anchor_placements(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
    candidate_anchor_positions: &[CandidateAnchorPosition],
    score_limit: u32,
) -> GreedyPlacementResult {
    let mut best_result: Option<GreedyPlacementResult> = None;
    let blocked_spaces = normalized_blocked_spaces(request);

    for strategy in ANCHOR_SCAN_STRATEGIES {
        let ordered_anchor_positions =
            order_candidate_anchor_positions(candidate_anchor_positions, *strategy);
        let (placements, rejection_summary) =
            build_greedy_anchor_placements(request, orientation, &ordered_anchor_positions);
        let placements = refine_greedy_anchor_placements(
            request,
            orientation,
            &ordered_anchor_positions,
            placements,
            score_limit,
            &blocked_spaces,
        );
        let scored_placements = placements
            .iter()
            .take(score_limit as usize)
            .cloned()
            .collect::<Vec<_>>();
        let result = GreedyPlacementResult {
            scan_strategy: *strategy,
            layout_quality: calculate_layout_quality(
                request.loading_space.usable_space,
                &scored_placements,
                &blocked_spaces,
            ),
            placements,
            rejection_summary,
        };
        if best_result
            .as_ref()
            .is_none_or(|current| greedy_result_is_better(&result, current))
        {
            best_result = Some(result);
        }
    }

    best_result.expect("at least one anchor scan strategy must be evaluated")
}

fn greedy_result_is_better(
    candidate: &GreedyPlacementResult,
    current: &GreedyPlacementResult,
) -> bool {
    compare_u32(
        candidate.placements.len().min(u32::MAX as usize) as u32,
        current.placements.len().min(u32::MAX as usize) as u32,
    )
    .then_with(|| compare_layout_quality(&candidate.layout_quality, &current.layout_quality))
        == Ordering::Greater
}

fn calculate_layout_quality(
    loading_space: DimensionsMm,
    placements: &[LoadingPlacement],
    blocked_spaces: &[LoadingSpaceBlockedSpaceInput],
) -> LayoutQuality {
    if placements.is_empty() {
        return LayoutQuality {
            layout_score: 0.0,
            occupied_span_rate: 1.0,
            center_of_gravity_height_rate: 1.0,
            boundary_contact_count: 0,
            blocked_edge_contact_count: 0,
            occupied_span_volume_mm3: u128::MAX,
            center_of_gravity_height_sum_twice_mm: u128::MAX,
        };
    }

    let mut min_x = u32::MAX;
    let mut min_y = u32::MAX;
    let mut min_z = u32::MAX;
    let mut max_x = 0u32;
    let mut max_y = 0u32;
    let mut max_z = 0u32;
    let mut center_of_gravity_height_sum_twice_mm = 0u128;
    let mut boundary_contact_count = 0u32;
    let mut blocked_edge_contact_count = 0u32;

    for placement in placements {
        let end_x = placement
            .position_mm
            .x_mm
            .saturating_add(placement.dimension.length_mm);
        let end_y = placement
            .position_mm
            .y_mm
            .saturating_add(placement.dimension.width_mm);
        let end_z = placement
            .position_mm
            .z_mm
            .saturating_add(placement.dimension.height_mm);

        min_x = min_x.min(placement.position_mm.x_mm);
        min_y = min_y.min(placement.position_mm.y_mm);
        min_z = min_z.min(placement.position_mm.z_mm);
        max_x = max_x.max(end_x);
        max_y = max_y.max(end_y);
        max_z = max_z.max(end_z);

        center_of_gravity_height_sum_twice_mm +=
            placement.position_mm.z_mm as u128 * 2 + placement.dimension.height_mm as u128;

        if placement.position_mm.x_mm == 0 || end_x == loading_space.length_mm {
            boundary_contact_count = boundary_contact_count.saturating_add(1);
        }
        if placement.position_mm.y_mm == 0 || end_y == loading_space.width_mm {
            boundary_contact_count = boundary_contact_count.saturating_add(1);
        }
        if placement.position_mm.z_mm == 0 || end_z == loading_space.height_mm {
            boundary_contact_count = boundary_contact_count.saturating_add(1);
        }
        blocked_edge_contact_count = blocked_edge_contact_count.saturating_add(
            blocked_spaces
                .iter()
                .filter(|blocked_space| {
                    placement_touches_blocked_space_edge(placement, blocked_space)
                })
                .count()
                .min(u32::MAX as usize) as u32,
        );
    }

    let occupied_span_volume_mm3 = max_x.saturating_sub(min_x) as u128
        * max_y.saturating_sub(min_y) as u128
        * max_z.saturating_sub(min_z) as u128;
    let loading_space_volume_mm3 = loading_space.volume_mm3().max(1);
    let occupied_span_rate =
        (occupied_span_volume_mm3 as f64 / loading_space_volume_mm3 as f64).min(1.0);
    let center_of_gravity_height_rate = (center_of_gravity_height_sum_twice_mm as f64
        / (placements.len() as f64 * loading_space.height_mm as f64 * 2.0))
        .min(1.0);
    let maximum_boundary_contact_count = placements.len().saturating_mul(3).max(1) as f64;
    let boundary_contact_rate =
        (boundary_contact_count as f64 / maximum_boundary_contact_count).min(1.0);
    let blocked_edge_contact_rate =
        (blocked_edge_contact_count as f64 / placements.len().max(1) as f64).min(1.0);
    let layout_score = (1.0 - occupied_span_rate) * 0.35
        + (1.0 - center_of_gravity_height_rate) * 0.35
        + blocked_edge_contact_rate * 0.20
        + boundary_contact_rate * 0.10;

    LayoutQuality {
        layout_score,
        occupied_span_rate,
        center_of_gravity_height_rate,
        boundary_contact_count,
        blocked_edge_contact_count,
        occupied_span_volume_mm3,
        center_of_gravity_height_sum_twice_mm,
    }
}

fn order_candidate_anchor_positions(
    candidate_anchor_positions: &[CandidateAnchorPosition],
    strategy: AnchorScanStrategy,
) -> Vec<CandidateAnchorPosition> {
    let mut ordered = candidate_anchor_positions.to_vec();
    ordered.sort_by(|left, right| compare_anchor_scan_order(left, right, strategy));
    ordered
}

fn compare_anchor_scan_order(
    left: &CandidateAnchorPosition,
    right: &CandidateAnchorPosition,
    strategy: AnchorScanStrategy,
) -> Ordering {
    compare_u32(left.origin_mm.z_mm, right.origin_mm.z_mm)
        .then_with(|| match strategy {
            AnchorScanStrategy::LayerRowColumn => {
                compare_u32(left.origin_mm.y_mm, right.origin_mm.y_mm)
                    .then_with(|| compare_u32(left.origin_mm.x_mm, right.origin_mm.x_mm))
            }
            AnchorScanStrategy::LayerColumnRow => {
                compare_u32(left.origin_mm.x_mm, right.origin_mm.x_mm)
                    .then_with(|| compare_u32(left.origin_mm.y_mm, right.origin_mm.y_mm))
            }
            AnchorScanStrategy::LayerRowReverseColumn => {
                compare_u32(left.origin_mm.y_mm, right.origin_mm.y_mm)
                    .then_with(|| compare_u32(right.origin_mm.x_mm, left.origin_mm.x_mm))
            }
            AnchorScanStrategy::LayerReverseRowColumn => {
                compare_u32(right.origin_mm.y_mm, left.origin_mm.y_mm)
                    .then_with(|| compare_u32(left.origin_mm.x_mm, right.origin_mm.x_mm))
            }
            AnchorScanStrategy::LayerReverseRowReverseColumn => {
                compare_u32(right.origin_mm.y_mm, left.origin_mm.y_mm)
                    .then_with(|| compare_u32(right.origin_mm.x_mm, left.origin_mm.x_mm))
            }
            AnchorScanStrategy::LayerReverseColumnReverseRow => {
                compare_u32(right.origin_mm.x_mm, left.origin_mm.x_mm)
                    .then_with(|| compare_u32(right.origin_mm.y_mm, left.origin_mm.y_mm))
            }
        })
        .then_with(|| compare_u32(left.layer_index, right.layer_index))
        .then_with(|| compare_u32(left.row_index, right.row_index))
        .then_with(|| compare_u32(left.column_index, right.column_index))
}

fn build_greedy_anchor_placements(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
    candidate_anchor_positions: &[CandidateAnchorPosition],
) -> (Vec<LoadingPlacement>, LoadingPlacementRejectionSummary) {
    let mut placements = Vec::new();
    let mut rejection_summary = LoadingPlacementRejectionSummary::default();
    for anchor in candidate_anchor_positions {
        match try_add_anchor_placement_detailed(request, orientation, *anchor, &mut placements) {
            Ok(()) => rejection_summary.record_acceptance(),
            Err(rejection) => rejection_summary.record_rejection(&rejection),
        }
    }
    (placements, rejection_summary)
}

fn refine_greedy_anchor_placements(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
    ordered_anchor_positions: &[CandidateAnchorPosition],
    initial_placements: Vec<LoadingPlacement>,
    score_limit: u32,
    blocked_spaces: &[LoadingSpaceBlockedSpaceInput],
) -> Vec<LoadingPlacement> {
    if ordered_anchor_positions.len() > LOCAL_SEARCH_MAX_ANCHOR_COUNT {
        return initial_placements;
    }

    let mut best_placements = initial_placements;
    let clearance_mm = collision_clearance_mm(request);
    for candidate_anchor in ordered_anchor_positions {
        if placement_collides_with_blocked_space(
            candidate_anchor.origin_mm,
            orientation.dimension,
            request,
        ) {
            continue;
        }

        let conflicting_indexes = best_placements
            .iter()
            .enumerate()
            .filter_map(|(index, placement)| {
                aabb_intersects_with_horizontal_clearance(
                    candidate_anchor.origin_mm,
                    orientation.dimension,
                    placement.position_mm,
                    placement.dimension,
                    clearance_mm,
                )
                .then_some(index)
            })
            .collect::<Vec<_>>();
        if conflicting_indexes.is_empty() || conflicting_indexes.len() > LOCAL_SEARCH_MAX_CONFLICTS
        {
            continue;
        }

        let mut seed_anchors = best_placements
            .iter()
            .enumerate()
            .filter(|(index, _)| !conflicting_indexes.contains(index))
            .map(|(_, placement)| CandidateAnchorPosition {
                layer_index: placement.layer_index,
                row_index: placement.row_index,
                column_index: placement.column_index,
                origin_mm: placement.position_mm,
            })
            .collect::<Vec<_>>();
        seed_anchors.push(*candidate_anchor);
        seed_anchors.sort_by(|left, right| {
            compare_u32(left.origin_mm.z_mm, right.origin_mm.z_mm)
                .then_with(|| compare_u32(left.origin_mm.y_mm, right.origin_mm.y_mm))
                .then_with(|| compare_u32(left.origin_mm.x_mm, right.origin_mm.x_mm))
        });

        let mut seed_placements = Vec::new();
        for seed_anchor in seed_anchors {
            try_add_anchor_placement(request, orientation, seed_anchor, &mut seed_placements);
        }
        let refined_placements = build_greedy_anchor_placements_with_seed(
            request,
            orientation,
            ordered_anchor_positions,
            seed_placements,
        );
        if placement_sets_are_better(
            request.loading_space.usable_space,
            score_limit,
            blocked_spaces,
            &refined_placements,
            &best_placements,
        ) {
            best_placements = refined_placements;
        }
    }

    best_placements
}

fn build_greedy_anchor_placements_with_seed(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
    ordered_anchor_positions: &[CandidateAnchorPosition],
    mut placements: Vec<LoadingPlacement>,
) -> Vec<LoadingPlacement> {
    reindex_placements(&mut placements);
    for anchor in ordered_anchor_positions {
        try_add_anchor_placement(request, orientation, *anchor, &mut placements);
    }
    reindex_placements(&mut placements);
    placements
}

fn try_add_anchor_placement(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
    anchor: CandidateAnchorPosition,
    placements: &mut Vec<LoadingPlacement>,
) -> bool {
    try_add_anchor_placement_detailed(request, orientation, anchor, placements).is_ok()
}

fn try_add_anchor_placement_detailed(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
    anchor: CandidateAnchorPosition,
    placements: &mut Vec<LoadingPlacement>,
) -> Result<(), PlacementRejection> {
    let clearance_mm = collision_clearance_mm(request);
    if !aabb_is_inside_loading_space_with_horizontal_boundary_clearance(
        anchor.origin_mm,
        orientation.dimension,
        request.loading_space.usable_space,
        boundary_clearance_mm(request),
    ) {
        return Err(PlacementRejection {
            reason: PlacementRejectionReason::Boundary,
            witness: None,
        });
    }
    if let Some(witness) =
        find_blocked_space_collision_witness(anchor.origin_mm, orientation.dimension, request)
    {
        return Err(PlacementRejection {
            reason: PlacementRejectionReason::BlockedSpace,
            witness: Some(witness),
        });
    }
    if let Some(witness) = find_existing_placement_collision_witness(
        anchor.origin_mm,
        orientation.dimension,
        placements,
        clearance_mm,
    ) {
        return Err(PlacementRejection {
            reason: PlacementRejectionReason::Collision,
            witness: Some(witness),
        });
    }
    if !placement_has_horizontal_support_plane(
        anchor.origin_mm,
        orientation.dimension,
        placements,
        normalized_blocked_spaces(request),
    ) {
        return Err(PlacementRejection {
            reason: PlacementRejectionReason::Support,
            witness: None,
        });
    }

    placements.push(LoadingPlacement {
        package_index: placements.len().min(u32::MAX as usize) as u32,
        layer_index: anchor.layer_index,
        row_index: anchor.row_index,
        column_index: anchor.column_index,
        position_mm: anchor.origin_mm,
        dimension: orientation.dimension,
        orientation_label: orientation.label,
    });
    Ok(())
}

fn reindex_placements(placements: &mut [LoadingPlacement]) {
    for (index, placement) in placements.iter_mut().enumerate() {
        placement.package_index = index.min(u32::MAX as usize) as u32;
    }
}

fn placement_sets_are_better(
    loading_space: DimensionsMm,
    score_limit: u32,
    blocked_spaces: &[LoadingSpaceBlockedSpaceInput],
    candidate: &[LoadingPlacement],
    current: &[LoadingPlacement],
) -> bool {
    let count_comparison = compare_u32(
        candidate.len().min(u32::MAX as usize) as u32,
        current.len().min(u32::MAX as usize) as u32,
    );
    if count_comparison != Ordering::Equal {
        return count_comparison == Ordering::Greater;
    }

    let candidate_quality = calculate_layout_quality(
        loading_space,
        &candidate
            .iter()
            .take(score_limit as usize)
            .cloned()
            .collect::<Vec<_>>(),
        blocked_spaces,
    );
    let current_quality = calculate_layout_quality(
        loading_space,
        &current
            .iter()
            .take(score_limit as usize)
            .cloned()
            .collect::<Vec<_>>(),
        blocked_spaces,
    );
    compare_layout_quality(&candidate_quality, &current_quality) == Ordering::Greater
}

fn placement_has_horizontal_support_plane(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    placements: &[LoadingPlacement],
    blocked_spaces: &[LoadingSpaceBlockedSpaceInput],
) -> bool {
    if origin_mm.z_mm == 0 {
        return true;
    }

    let mut support_surfaces = Vec::new();
    for placement in placements {
        if placement
            .position_mm
            .z_mm
            .checked_add(placement.dimension.height_mm)
            == Some(origin_mm.z_mm)
        {
            support_surfaces.push(HorizontalSupportSurface::AxisAligned {
                origin_mm: placement.position_mm,
                dimension: placement.dimension,
            });
        }
    }
    for blocked_space in blocked_spaces {
        if let Some(support_surface) =
            blocked_space_horizontal_support_surface(blocked_space, origin_mm.z_mm)
        {
            support_surfaces.push(support_surface);
        }
    }

    horizontal_surfaces_cover_footprint(origin_mm, dimension, &support_surfaces)
}

fn validate_generated_placements(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
    placements: &[LoadingPlacement],
) -> Result<(), String> {
    let blocked_spaces = normalized_blocked_spaces(request);
    let collision_clearance_mm = collision_clearance_mm(request);
    let boundary_clearance_mm = boundary_clearance_mm(request);

    for (index, placement) in placements.iter().enumerate() {
        if placement.package_index != index.min(u32::MAX as usize) as u32 {
            return Err(format!("第 {} 个箱体的 packageIndex 不连续", index));
        }
        if placement.dimension != orientation.dimension {
            return Err(format!(
                "第 {} 个箱体尺寸与朝向 {} 不一致",
                index, orientation.label
            ));
        }
        if !aabb_is_inside_loading_space_with_horizontal_boundary_clearance(
            placement.position_mm,
            placement.dimension,
            request.loading_space.usable_space,
            boundary_clearance_mm,
        ) {
            return Err(format!("第 {} 个箱体超出 usableSpace", index));
        }
        if blocked_spaces.iter().any(|blocked_space| {
            placement_intersects_blocked_space(
                placement.position_mm,
                placement.dimension,
                blocked_space,
                collision_clearance_mm,
            )
        }) {
            return Err(format!("第 {} 个箱体与 blockedSpace 碰撞", index));
        }
        if !placement_has_horizontal_support_plane(
            placement.position_mm,
            placement.dimension,
            placements,
            blocked_spaces,
        ) {
            return Err(format!("第 {} 个箱体没有完整水平支撑", index));
        }
        if placements[..index].iter().any(|previous| {
            aabb_intersects_with_horizontal_clearance(
                placement.position_mm,
                placement.dimension,
                previous.position_mm,
                previous.dimension,
                collision_clearance_mm,
            )
        }) {
            return Err(format!("第 {} 个箱体与前序箱体碰撞", index));
        }
    }

    Ok(())
}

fn horizontal_surface_covers(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    support_surface: &HorizontalSupportSurface,
) -> bool {
    match support_surface {
        HorizontalSupportSurface::AxisAligned {
            origin_mm: support_origin_mm,
            dimension: support_dimension,
        } => {
            origin_mm.x_mm >= support_origin_mm.x_mm
                && origin_mm
                    .x_mm
                    .checked_add(dimension.length_mm)
                    .is_some_and(|end| {
                        support_origin_mm
                            .x_mm
                            .checked_add(support_dimension.length_mm)
                            .is_some_and(|support_end| end <= support_end)
                    })
                && origin_mm.y_mm >= support_origin_mm.y_mm
                && origin_mm
                    .y_mm
                    .checked_add(dimension.width_mm)
                    .is_some_and(|end| {
                        support_origin_mm
                            .y_mm
                            .checked_add(support_dimension.width_mm)
                            .is_some_and(|support_end| end <= support_end)
                    })
        }
        HorizontalSupportSurface::OrientedTop {
            center_mm,
            half_extents_mm,
            axes,
        } => axis_aligned_footprint_is_inside_oriented_support(
            origin_mm,
            dimension,
            *center_mm,
            *half_extents_mm,
            *axes,
        ),
    }
}

fn horizontal_surfaces_cover_footprint(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    support_surfaces: &[HorizontalSupportSurface],
) -> bool {
    if support_surfaces.is_empty() {
        return false;
    }

    if support_surfaces
        .iter()
        .any(|support_surface| horizontal_surface_covers(origin_mm, dimension, support_surface))
    {
        return true;
    }

    let Some(end_x) = origin_mm.x_mm.checked_add(dimension.length_mm) else {
        return false;
    };
    let Some(end_y) = origin_mm.y_mm.checked_add(dimension.width_mm) else {
        return false;
    };

    let mut x_points = vec![origin_mm.x_mm, end_x];
    let mut y_points = vec![origin_mm.y_mm, end_y];
    for support_surface in support_surfaces {
        let HorizontalSupportSurface::AxisAligned {
            origin_mm: support_origin_mm,
            dimension: support_dimension,
        } = support_surface
        else {
            continue;
        };
        if !intervals_overlap(
            origin_mm.x_mm,
            dimension.length_mm,
            support_origin_mm.x_mm,
            support_dimension.length_mm,
        ) || !intervals_overlap(
            origin_mm.y_mm,
            dimension.width_mm,
            support_origin_mm.y_mm,
            support_dimension.width_mm,
        ) {
            continue;
        }

        let support_end_x = support_origin_mm
            .x_mm
            .checked_add(support_dimension.length_mm)
            .unwrap_or(end_x);
        let support_end_y = support_origin_mm
            .y_mm
            .checked_add(support_dimension.width_mm)
            .unwrap_or(end_y);
        x_points.push(support_origin_mm.x_mm.max(origin_mm.x_mm));
        x_points.push(support_end_x.min(end_x));
        y_points.push(support_origin_mm.y_mm.max(origin_mm.y_mm));
        y_points.push(support_end_y.min(end_y));
    }

    x_points.sort_unstable();
    x_points.dedup();
    y_points.sort_unstable();
    y_points.dedup();

    for x_window in x_points.windows(2) {
        for y_window in y_points.windows(2) {
            let cell_origin = PositionMm {
                x_mm: x_window[0],
                y_mm: y_window[0],
                z_mm: origin_mm.z_mm,
            };
            let cell_dimension = DimensionsMm {
                length_mm: x_window[1] - x_window[0],
                width_mm: y_window[1] - y_window[0],
                height_mm: 1,
            };
            if !support_surfaces.iter().any(|support_surface| {
                horizontal_surface_covers(cell_origin, cell_dimension, support_surface)
            }) {
                return false;
            }
        }
    }

    true
}

fn blocked_space_horizontal_support_surface(
    blocked_space: &LoadingSpaceBlockedSpaceInput,
    support_z_mm: u32,
) -> Option<HorizontalSupportSurface> {
    if !blocked_space_supports_horizontal_plane(blocked_space) {
        return None;
    }

    if let Some(obb) = &blocked_space.obb {
        return obb_horizontal_support_surface(obb, support_z_mm);
    }

    if blocked_space
        .origin_mm
        .z_mm
        .checked_add(blocked_space.dimension.height_mm)
        != Some(support_z_mm)
    {
        return None;
    }

    Some(HorizontalSupportSurface::AxisAligned {
        origin_mm: blocked_space.origin_mm,
        dimension: blocked_space.dimension,
    })
}

fn obb_horizontal_support_surface(
    obb: &LoadingSpaceObbInput,
    support_z_mm: u32,
) -> Option<HorizontalSupportSurface> {
    let (vertical_axis_index, vertical_axis) = obb.axes.iter().enumerate().find(|(_, axis)| {
        axis[0].abs() <= SUPPORT_PLANE_TOLERANCE_MM
            && axis[1].abs() <= SUPPORT_PLANE_TOLERANCE_MM
            && (axis[2].abs() - 1.0).abs() <= SUPPORT_PLANE_TOLERANCE_MM
    })?;
    let top_sign = if vertical_axis[2] >= 0.0 { 1.0 } else { -1.0 };
    let top_center_mm = [
        obb.center_mm[0] + top_sign * obb.half_extents_mm[vertical_axis_index] * vertical_axis[0],
        obb.center_mm[1] + top_sign * obb.half_extents_mm[vertical_axis_index] * vertical_axis[1],
    ];
    let top_z_mm =
        obb.center_mm[2] + top_sign * obb.half_extents_mm[vertical_axis_index] * vertical_axis[2];
    if (top_z_mm - support_z_mm as f64).abs() > SUPPORT_PLANE_TOLERANCE_MM {
        return None;
    }

    let mut half_extents_mm = [0.0; 2];
    let mut axes = [[0.0; 2]; 2];
    let mut horizontal_axis_count = 0;
    for (axis_index, axis) in obb.axes.iter().enumerate() {
        if axis_index == vertical_axis_index {
            continue;
        }
        if axis[2].abs() > SUPPORT_PLANE_TOLERANCE_MM {
            return None;
        }

        let projected_length = (axis[0] * axis[0] + axis[1] * axis[1]).sqrt();
        if !projected_length.is_finite() || projected_length <= SUPPORT_PLANE_TOLERANCE_MM {
            return None;
        }

        axes[horizontal_axis_count] = [axis[0] / projected_length, axis[1] / projected_length];
        half_extents_mm[horizontal_axis_count] = obb.half_extents_mm[axis_index] * projected_length;
        horizontal_axis_count += 1;
    }

    if horizontal_axis_count != 2 {
        return None;
    }

    Some(HorizontalSupportSurface::OrientedTop {
        center_mm: top_center_mm,
        half_extents_mm,
        axes,
    })
}

fn axis_aligned_footprint_is_inside_oriented_support(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    support_center_mm: [f64; 2],
    support_half_extents_mm: [f64; 2],
    support_axes: [[f64; 2]; 2],
) -> bool {
    let Some(end_x_mm) = origin_mm.x_mm.checked_add(dimension.length_mm) else {
        return false;
    };
    let Some(end_y_mm) = origin_mm.y_mm.checked_add(dimension.width_mm) else {
        return false;
    };
    let footprint_corners_mm = [
        [origin_mm.x_mm as f64, origin_mm.y_mm as f64],
        [end_x_mm as f64, origin_mm.y_mm as f64],
        [origin_mm.x_mm as f64, end_y_mm as f64],
        [end_x_mm as f64, end_y_mm as f64],
    ];

    footprint_corners_mm.into_iter().all(|corner_mm| {
        point_is_inside_oriented_support(
            corner_mm,
            support_center_mm,
            support_half_extents_mm,
            support_axes,
        )
    })
}

fn point_is_inside_oriented_support(
    point_mm: [f64; 2],
    support_center_mm: [f64; 2],
    support_half_extents_mm: [f64; 2],
    support_axes: [[f64; 2]; 2],
) -> bool {
    let delta_mm = [
        point_mm[0] - support_center_mm[0],
        point_mm[1] - support_center_mm[1],
    ];
    (0..2).all(|axis_index| {
        let distance_mm = vector_dot_2d(delta_mm, support_axes[axis_index]);
        distance_mm.is_finite()
            && distance_mm.abs() <= support_half_extents_mm[axis_index] + SUPPORT_PLANE_TOLERANCE_MM
    })
}

fn vector_dot_2d(left: [f64; 2], right: [f64; 2]) -> f64 {
    left[0] * right[0] + left[1] * right[1]
}

fn find_existing_placement_collision_witness(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    placements: &[LoadingPlacement],
    clearance_mm: u32,
) -> Option<LoadingCollisionWitness> {
    placements
        .iter()
        .find(|placement| {
            aabb_intersects_with_horizontal_clearance(
                origin_mm,
                dimension,
                placement.position_mm,
                placement.dimension,
                clearance_mm,
            )
        })
        .map(|placement| LoadingCollisionWitness {
            kind: "placement".to_owned(),
            anchor_mm: origin_mm,
            dimension,
            other_id: Some(format!("package-{}", placement.package_index)),
            other_origin_mm: Some(placement.position_mm),
            other_dimension: Some(placement.dimension),
            clearance_mm,
        })
}

fn build_loading_space_plan_warnings(
    request: &LoadingSpacePlanRequest,
    candidate: &CandidatePlan,
    remaining_boxes: u32,
) -> Vec<LoadingWarning> {
    let mut warnings = Vec::new();
    if remaining_boxes > 0 {
        warnings.push(LoadingWarning {
            code: "MULTIPLE_LOADING_UNITS_REQUIRED".to_owned(),
            message: format!(
                "单个装载单元剩余 {} 箱，需要多个装载单元或分批装载",
                remaining_boxes
            ),
        });
    }
    if candidate.weight_rate > 0.85 {
        warnings.push(LoadingWarning {
            code: "HIGH_WEIGHT_UTILIZATION".to_owned(),
            message: "重量利用率较高，请复核载重余量".to_owned(),
        });
    }
    if candidate.volume_rate > 0.85 {
        warnings.push(LoadingWarning {
            code: "HIGH_VOLUME_UTILIZATION".to_owned(),
            message: "体积利用率较高，请复核空间余量".to_owned(),
        });
    }
    if candidate.max_boxes_per_unit < request.package.quantity && request.package.quantity > 0 {
        warnings.push(LoadingWarning {
            code: "PREVIEW_SHOWS_FIRST_LOADING_UNIT_ONLY".to_owned(),
            message: "当前 placements 只描述第一个装载单元的摆放，不代表所有装载单元总摆放"
                .to_owned(),
        });
    }
    if candidate.grid.blocked_positions > 0 {
        warnings.push(LoadingWarning {
            code: "BLOCKED_SPACE_REDUCED_CAPACITY".to_owned(),
            message: format!(
                "障碍区、已占用空间或水平支撑平面约束过滤了 {} 个候选锚点，已按实际可摆放位置重新计算",
                candidate.grid.blocked_positions
            ),
        });
    }
    warnings
}

fn ceil_div_u32(numerator: u32, denominator: u32) -> u32 {
    if denominator == 0 {
        return 0;
    }
    numerator.div_ceil(denominator)
}

fn normalized_blocked_spaces(
    request: &LoadingSpacePlanRequest,
) -> &[LoadingSpaceBlockedSpaceInput] {
    request
        .loading_space
        .blocked_spaces
        .as_deref()
        .unwrap_or_default()
}

fn placement_collides_with_blocked_space(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    request: &LoadingSpacePlanRequest,
) -> bool {
    find_blocked_space_collision_witness(origin_mm, dimension, request).is_some()
}

fn find_blocked_space_collision_witness(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    request: &LoadingSpacePlanRequest,
) -> Option<LoadingCollisionWitness> {
    let clearance_mm = collision_clearance_mm(request);
    normalized_blocked_spaces(request)
        .iter()
        .find(|blocked_space| {
            placement_intersects_blocked_space(origin_mm, dimension, blocked_space, clearance_mm)
        })
        .map(|blocked_space| LoadingCollisionWitness {
            kind: if blocked_space.obb.is_some() {
                "blockedSpaceObb".to_owned()
            } else {
                "blockedSpace".to_owned()
            },
            anchor_mm: origin_mm,
            dimension,
            other_id: Some(blocked_space.id.clone()),
            other_origin_mm: Some(blocked_space.origin_mm),
            other_dimension: Some(blocked_space.dimension),
            clearance_mm,
        })
}

#[derive(Debug, Clone, Copy)]
struct OrientedBoxMm {
    center_mm: [f64; 3],
    half_extents_mm: [f64; 3],
    axes: [[f64; 3]; 3],
}

fn placement_intersects_blocked_space(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    blocked_space: &LoadingSpaceBlockedSpaceInput,
    clearance_mm: u32,
) -> bool {
    if let Some(obb) = &blocked_space.obb {
        return obb_intersects(
            axis_aligned_obb(origin_mm, dimension, clearance_mm),
            oriented_box_from_input(obb),
        );
    }

    aabb_intersects_with_horizontal_clearance(
        origin_mm,
        dimension,
        blocked_space.origin_mm,
        blocked_space.dimension,
        clearance_mm,
    )
}

fn axis_aligned_obb(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    horizontal_clearance_mm: u32,
) -> OrientedBoxMm {
    OrientedBoxMm {
        center_mm: [
            origin_mm.x_mm as f64 + dimension.length_mm as f64 / 2.0,
            origin_mm.y_mm as f64 + dimension.width_mm as f64 / 2.0,
            origin_mm.z_mm as f64 + dimension.height_mm as f64 / 2.0,
        ],
        half_extents_mm: [
            dimension.length_mm as f64 / 2.0 + horizontal_clearance_mm as f64,
            dimension.width_mm as f64 / 2.0 + horizontal_clearance_mm as f64,
            dimension.height_mm as f64 / 2.0,
        ],
        axes: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
    }
}

fn oriented_box_from_input(input: &LoadingSpaceObbInput) -> OrientedBoxMm {
    OrientedBoxMm {
        center_mm: input.center_mm,
        half_extents_mm: input.half_extents_mm,
        axes: input.axes,
    }
}

fn obb_intersects(left: OrientedBoxMm, right: OrientedBoxMm) -> bool {
    const PARALLEL_AXIS_EPSILON: f64 = 1e-12;
    const CONTACT_TOLERANCE_MM: f64 = 1e-7;

    let mut rotation = [[0.0; 3]; 3];
    let mut absolute_rotation = [[0.0; 3]; 3];
    for (left_index, left_axis) in left.axes.iter().enumerate() {
        for (right_index, right_axis) in right.axes.iter().enumerate() {
            rotation[left_index][right_index] = vector_dot(*left_axis, *right_axis);
            absolute_rotation[left_index][right_index] =
                rotation[left_index][right_index].abs() + PARALLEL_AXIS_EPSILON;
        }
    }

    let center_delta = [
        right.center_mm[0] - left.center_mm[0],
        right.center_mm[1] - left.center_mm[1],
        right.center_mm[2] - left.center_mm[2],
    ];
    let translated_center = [
        vector_dot(center_delta, left.axes[0]),
        vector_dot(center_delta, left.axes[1]),
        vector_dot(center_delta, left.axes[2]),
    ];

    for left_index in 0..3 {
        let left_radius = left.half_extents_mm[left_index];
        let right_radius = (0..3)
            .map(|right_index| {
                right.half_extents_mm[right_index] * absolute_rotation[left_index][right_index]
            })
            .sum::<f64>();
        if translated_center[left_index].abs() >= left_radius + right_radius - CONTACT_TOLERANCE_MM
        {
            return false;
        }
    }

    for right_index in 0..3 {
        let left_radius = (0..3)
            .map(|left_index| {
                left.half_extents_mm[left_index] * absolute_rotation[left_index][right_index]
            })
            .sum::<f64>();
        let right_radius = right.half_extents_mm[right_index];
        if vector_dot(center_delta, right.axes[right_index]).abs()
            >= left_radius + right_radius - CONTACT_TOLERANCE_MM
        {
            return false;
        }
    }

    for left_index in 0..3 {
        for right_index in 0..3 {
            let parallel_measure =
                1.0 - rotation[left_index][right_index] * rotation[left_index][right_index];
            if parallel_measure <= PARALLEL_AXIS_EPSILON {
                continue;
            }
            let left_next = (left_index + 1) % 3;
            let left_previous = (left_index + 2) % 3;
            let right_next = (right_index + 1) % 3;
            let right_previous = (right_index + 2) % 3;
            let left_radius = left.half_extents_mm[left_next]
                * absolute_rotation[left_previous][right_index]
                + left.half_extents_mm[left_previous] * absolute_rotation[left_next][right_index];
            let right_radius = right.half_extents_mm[right_next]
                * absolute_rotation[left_index][right_previous]
                + right.half_extents_mm[right_previous] * absolute_rotation[left_index][right_next];
            let distance = (translated_center[left_previous] * rotation[left_next][right_index]
                - translated_center[left_next] * rotation[left_previous][right_index])
                .abs();
            if distance >= left_radius + right_radius - CONTACT_TOLERANCE_MM {
                return false;
            }
        }
    }

    true
}

fn vector_dot(left: [f64; 3], right: [f64; 3]) -> f64 {
    left[0] * right[0] + left[1] * right[1] + left[2] * right[2]
}

fn placement_touches_blocked_space_edge(
    placement: &LoadingPlacement,
    blocked_space: &LoadingSpaceBlockedSpaceInput,
) -> bool {
    let Some(placement_end_x) = placement
        .position_mm
        .x_mm
        .checked_add(placement.dimension.length_mm)
    else {
        return false;
    };
    let Some(placement_end_y) = placement
        .position_mm
        .y_mm
        .checked_add(placement.dimension.width_mm)
    else {
        return false;
    };
    let Some(placement_end_z) = placement
        .position_mm
        .z_mm
        .checked_add(placement.dimension.height_mm)
    else {
        return false;
    };
    let Some(blocked_end_x) = blocked_space
        .origin_mm
        .x_mm
        .checked_add(blocked_space.dimension.length_mm)
    else {
        return false;
    };
    let Some(blocked_end_y) = blocked_space
        .origin_mm
        .y_mm
        .checked_add(blocked_space.dimension.width_mm)
    else {
        return false;
    };
    let Some(blocked_end_z) = blocked_space
        .origin_mm
        .z_mm
        .checked_add(blocked_space.dimension.height_mm)
    else {
        return false;
    };

    let x_touch = placement_end_x == blocked_space.origin_mm.x_mm
        || blocked_end_x == placement.position_mm.x_mm;
    let y_touch = placement_end_y == blocked_space.origin_mm.y_mm
        || blocked_end_y == placement.position_mm.y_mm;
    let z_touch = placement_end_z == blocked_space.origin_mm.z_mm
        || blocked_end_z == placement.position_mm.z_mm;
    let x_overlap = intervals_overlap(
        placement.position_mm.x_mm,
        placement.dimension.length_mm,
        blocked_space.origin_mm.x_mm,
        blocked_space.dimension.length_mm,
    );
    let y_overlap = intervals_overlap(
        placement.position_mm.y_mm,
        placement.dimension.width_mm,
        blocked_space.origin_mm.y_mm,
        blocked_space.dimension.width_mm,
    );
    let z_overlap = intervals_overlap(
        placement.position_mm.z_mm,
        placement.dimension.height_mm,
        blocked_space.origin_mm.z_mm,
        blocked_space.dimension.height_mm,
    );

    (x_touch && y_overlap && z_overlap)
        || (y_touch && x_overlap && z_overlap)
        || (z_touch && x_overlap && y_overlap)
}

fn blocked_space_supports_horizontal_plane(blocked_space: &LoadingSpaceBlockedSpaceInput) -> bool {
    normalize_blocked_space_kind(&blocked_space.kind) != "keepout"
}

fn normalize_blocked_space_kind(kind: &str) -> String {
    kind.chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect()
}

#[cfg(test)]
fn aabb_intersects(
    left_origin: PositionMm,
    left_dimension: DimensionsMm,
    right_origin: PositionMm,
    right_dimension: DimensionsMm,
) -> bool {
    aabb_intersects_with_horizontal_clearance(
        left_origin,
        left_dimension,
        right_origin,
        right_dimension,
        0,
    )
}

fn aabb_intersects_with_horizontal_clearance(
    left_origin: PositionMm,
    left_dimension: DimensionsMm,
    right_origin: PositionMm,
    right_dimension: DimensionsMm,
    clearance_mm: u32,
) -> bool {
    intervals_overlap_with_clearance(
        left_origin.x_mm,
        left_dimension.length_mm,
        right_origin.x_mm,
        right_dimension.length_mm,
        clearance_mm,
    ) && intervals_overlap_with_clearance(
        left_origin.y_mm,
        left_dimension.width_mm,
        right_origin.y_mm,
        right_dimension.width_mm,
        clearance_mm,
    ) && intervals_overlap(
        left_origin.z_mm,
        left_dimension.height_mm,
        right_origin.z_mm,
        right_dimension.height_mm,
    )
}

fn intervals_overlap(left_start: u32, left_size: u32, right_start: u32, right_size: u32) -> bool {
    intervals_overlap_with_clearance(left_start, left_size, right_start, right_size, 0)
}

fn intervals_overlap_with_clearance(
    left_start: u32,
    left_size: u32,
    right_start: u32,
    right_size: u32,
    clearance_mm: u32,
) -> bool {
    if left_size == 0 || right_size == 0 {
        return false;
    }
    let Some(left_end) = left_start.checked_add(left_size) else {
        return true;
    };
    let Some(right_end) = right_start.checked_add(right_size) else {
        return true;
    };
    let Some(left_end_with_clearance) = left_end.checked_add(clearance_mm) else {
        return true;
    };
    let Some(right_end_with_clearance) = right_end.checked_add(clearance_mm) else {
        return true;
    };
    left_start < right_end_with_clearance && left_end_with_clearance > right_start
}

fn aabb_is_inside_loading_space(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    loading_space: DimensionsMm,
) -> bool {
    origin_mm
        .x_mm
        .checked_add(dimension.length_mm)
        .is_some_and(|end| end <= loading_space.length_mm)
        && origin_mm
            .y_mm
            .checked_add(dimension.width_mm)
            .is_some_and(|end| end <= loading_space.width_mm)
        && origin_mm
            .z_mm
            .checked_add(dimension.height_mm)
            .is_some_and(|end| end <= loading_space.height_mm)
}

fn aabb_is_inside_loading_space_with_horizontal_boundary_clearance(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    loading_space: DimensionsMm,
    boundary_clearance_mm: u32,
) -> bool {
    origin_mm.x_mm >= boundary_clearance_mm
        && origin_mm.y_mm >= boundary_clearance_mm
        && origin_mm
            .x_mm
            .checked_add(dimension.length_mm)
            .and_then(|end| end.checked_add(boundary_clearance_mm))
            .is_some_and(|end| end <= loading_space.length_mm)
        && origin_mm
            .y_mm
            .checked_add(dimension.width_mm)
            .and_then(|end| end.checked_add(boundary_clearance_mm))
            .is_some_and(|end| end <= loading_space.width_mm)
        && origin_mm
            .z_mm
            .checked_add(dimension.height_mm)
            .is_some_and(|end| end <= loading_space.height_mm)
}
#[cfg(test)]
mod tests {
    use super::*;

    fn basic_request() -> VehicleLoadingPlanRequest {
        VehicleLoadingPlanRequest {
            schema_version: VEHICLE_LOADING_REQUEST_SCHEMA_VERSION.to_owned(),
            vehicle: VehicleLoadingVehicleInput {
                id: "van-standard".to_owned(),
                name: Some("标准厢车".to_owned()),
                usable_space: DimensionsMm {
                    length_mm: 1_200,
                    width_mm: 1_000,
                    height_mm: 1_000,
                },
                blocked_spaces: None,
                payload_kg: 1_000.0,
            },
            package: VehicleLoadingPackageInput {
                id: "box-a".to_owned(),
                name: Some("A箱".to_owned()),
                quantity: 20,
                unit_weight_kg: 10.0,
                dimension: DimensionsMm {
                    length_mm: 600,
                    width_mm: 500,
                    height_mm: 500,
                },
                can_rotate: true,
                can_invert: false,
            },
            limits: None,
        }
    }

    fn basic_loading_space_request() -> LoadingSpacePlanRequest {
        let vehicle_request = basic_request();
        LoadingSpacePlanRequest {
            schema_version: LOADING_SPACE_PLAN_REQUEST_SCHEMA_VERSION.to_owned(),
            loading_space: LoadingSpaceInput {
                id: "container-20ft".to_owned(),
                name: Some("20ft container".to_owned()),
                usable_space: vehicle_request.vehicle.usable_space,
                blocked_spaces: None,
                payload_kg: vehicle_request.vehicle.payload_kg,
            },
            package: vehicle_request.package,
            limits: None,
        }
    }

    #[test]
    fn builds_plan_for_generic_loading_space() {
        let plan =
            plan_loading_space(&basic_loading_space_request()).expect("plan should be generated");

        assert_eq!(plan.schema_version, LOADING_SPACE_PLAN_SCHEMA_VERSION);
        assert_eq!(plan.loading_space_id, "container-20ft");
        assert_eq!(plan.max_boxes_per_unit, 8);
        assert_eq!(plan.boxes_placed_in_preview_unit, 8);
        assert_eq!(plan.remaining_boxes_after_preview_unit, 12);
        assert_eq!(plan.units_needed, 3);
        assert_eq!(plan.search.evaluated_orientation_count, 2);
        assert_eq!(
            plan.search.evaluated_scan_strategy_count,
            ANCHOR_SCAN_STRATEGIES.len() as u32
        );
        assert_eq!(plan.search.selected_scan_strategy, "layer-row-column");
        assert_eq!(plan.search.candidate_summaries.len(), 2);
        assert!(plan
            .search
            .candidate_summaries
            .iter()
            .any(|candidate| candidate.orientation_label == "L-W-H"
                && candidate.max_boxes_per_unit == 8));
        assert!(plan
            .warnings
            .iter()
            .any(|warning| warning.code == "MULTIPLE_LOADING_UNITS_REQUIRED"));
    }

    #[test]
    fn exposes_layout_quality_metrics_for_each_candidate() {
        let plan = plan_vehicle_loading(&basic_request()).expect("plan should be generated");
        let selected = plan
            .search
            .candidate_summaries
            .iter()
            .find(|candidate| {
                candidate.orientation_label == plan.selected_orientation.label
                    && candidate.scan_strategy == plan.search.selected_scan_strategy
            })
            .expect("selected candidate summary should exist");

        assert!(selected.layout_score.is_finite());
        assert!((0.0..=1.0).contains(&selected.occupied_span_rate));
        assert!((0.0..=1.0).contains(&selected.center_of_gravity_height_rate));
        assert!(selected.boundary_contact_count > 0);
        assert_eq!(
            selected.rejection_summary.evaluated_anchor_count,
            selected.rejection_summary.accepted_anchor_count
                + selected.rejection_summary.boundary_rejection_count
                + selected.rejection_summary.blocked_space_rejection_count
                + selected.rejection_summary.collision_rejection_count
                + selected.rejection_summary.support_rejection_count
        );
    }

    #[test]
    fn rejection_summary_exposes_blocked_space_collision_witness() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 300,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.quantity = 2;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "middle-keep-out".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 100,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            obb: None,
        }]);

        let plan = plan_vehicle_loading(&request).expect("plan should be generated");
        let selected = plan
            .search
            .candidate_summaries
            .iter()
            .find(|candidate| {
                candidate.orientation_label == plan.selected_orientation.label
                    && candidate.scan_strategy == plan.search.selected_scan_strategy
            })
            .expect("selected candidate summary should exist");

        assert!(selected.rejection_summary.blocked_space_rejection_count > 0);
        let witness = selected
            .rejection_summary
            .first_collision_witness
            .as_ref()
            .expect("blocked space rejection should expose a witness");
        assert_eq!(witness.kind, "blockedSpace");
        assert_eq!(witness.other_id.as_deref(), Some("middle-keep-out"));
        assert_eq!(witness.anchor_mm.x_mm, 100);
    }

    #[test]
    fn rejection_summary_exposes_box_collision_witness_for_clearance_gap() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 300,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.quantity = 2;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.limits = Some(VehicleLoadingSearchLimits {
            max_placement_output: None,
            max_grid_cell_scan: None,
            collision_clearance_mm: Some(1),
            boundary_clearance_mm: None,
        });

        let plan = plan_vehicle_loading(&request).expect("plan should be generated");
        let selected = plan
            .search
            .candidate_summaries
            .iter()
            .find(|candidate| {
                candidate.orientation_label == plan.selected_orientation.label
                    && candidate.scan_strategy == plan.search.selected_scan_strategy
            })
            .expect("selected candidate summary should exist");

        assert!(selected.rejection_summary.collision_rejection_count > 0);
        let witness = selected
            .rejection_summary
            .first_collision_witness
            .as_ref()
            .expect("box collision rejection should expose a witness");
        assert_eq!(witness.kind, "placement");
        assert_eq!(witness.other_id.as_deref(), Some("package-1"));
        assert_eq!(witness.anchor_mm.x_mm, 200);
        assert_eq!(witness.clearance_mm, 1);
    }

    #[test]
    fn layout_quality_prefers_blocked_edge_contact_over_boundary_only_contact() {
        let loading_space = DimensionsMm {
            length_mm: 900,
            width_mm: 500,
            height_mm: 500,
        };
        let blocked_space = LoadingSpaceBlockedSpaceInput {
            id: "divider".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 350,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 500,
                height_mm: 500,
            },
            obb: None,
        };
        let package_dimension = DimensionsMm {
            length_mm: 400,
            width_mm: 500,
            height_mm: 500,
        };
        let blocked_edge_placement = LoadingPlacement {
            package_index: 0,
            layer_index: 0,
            row_index: 0,
            column_index: 0,
            position_mm: PositionMm {
                x_mm: 450,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: package_dimension,
            orientation_label: "L-W-H",
        };
        let vehicle_boundary_placement = LoadingPlacement {
            position_mm: PositionMm {
                x_mm: 500,
                y_mm: 0,
                z_mm: 0,
            },
            ..blocked_edge_placement
        };

        let blocked_edge_quality = calculate_layout_quality(
            loading_space,
            &[blocked_edge_placement],
            std::slice::from_ref(&blocked_space),
        );
        let vehicle_boundary_quality = calculate_layout_quality(
            loading_space,
            &[vehicle_boundary_placement],
            std::slice::from_ref(&blocked_space),
        );

        assert_eq!(blocked_edge_quality.blocked_edge_contact_count, 1);
        assert_eq!(vehicle_boundary_quality.blocked_edge_contact_count, 0);
        assert!(
            compare_layout_quality(&blocked_edge_quality, &vehicle_boundary_quality)
                == Ordering::Greater
        );
    }

    #[test]
    fn builds_deterministic_layered_plan_for_first_vehicle() {
        let plan = plan_vehicle_loading(&basic_request()).expect("plan should be generated");

        assert_eq!(plan.schema_version, VEHICLE_LOADING_PLAN_SCHEMA_VERSION);
        assert_eq!(plan.max_boxes_per_vehicle, 8);
        assert_eq!(plan.boxes_placed_in_preview_vehicle, 8);
        assert_eq!(plan.remaining_boxes_after_preview_vehicle, 12);
        assert_eq!(plan.vehicles_needed, 3);
        assert_eq!(plan.grid.boxes_along_length, 2);
        assert_eq!(plan.grid.boxes_along_width, 2);
        assert_eq!(plan.grid.layer_count, 2);
        assert_eq!(plan.search.evaluated_orientation_count, 2);
        assert_eq!(plan.placements.len(), 8);
        assert_eq!(
            plan.placements[7].position_mm,
            PositionMm {
                x_mm: 600,
                y_mm: 500,
                z_mm: 500
            }
        );
        assert!(plan
            .warnings
            .iter()
            .any(|warning| warning.code == "MULTIPLE_VEHICLES_REQUIRED"));
    }

    #[test]
    fn selects_rotated_orientation_when_it_places_more_boxes() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 1_000,
            width_mm: 1_200,
            height_mm: 1_000,
        };

        let plan = plan_vehicle_loading(&request).expect("plan should be generated");

        assert_eq!(plan.selected_orientation.label, "W-L-H");
        assert_eq!(plan.selected_orientation.yaw_degrees, 90);
        assert_eq!(plan.max_boxes_per_vehicle, 8);
    }

    #[test]
    fn normalizes_yaw_180_and_270_as_equivalent_aabb_rotations() {
        let orientations = get_vehicle_loading_orientations(
            DimensionsMm {
                length_mm: 400,
                width_mm: 200,
                height_mm: 100,
            },
            true,
            false,
        );

        assert_eq!(orientations.len(), 2);
        let upright = orientations
            .iter()
            .find(|orientation| orientation.label == "L-W-H")
            .expect("upright orientation should exist");
        assert_eq!(upright.yaw_degrees, 0);
        assert_eq!(upright.equivalent_yaw_degrees, YAW_0_180);

        let rotated = orientations
            .iter()
            .find(|orientation| orientation.label == "W-L-H")
            .expect("90 degree orientation should exist");
        assert_eq!(rotated.yaw_degrees, 90);
        assert_eq!(rotated.equivalent_yaw_degrees, YAW_90_270);
    }

    #[test]
    fn anchor_scan_strategies_keep_lower_layers_before_upper_layers() {
        let anchors = vec![
            CandidateAnchorPosition {
                layer_index: 1,
                row_index: 0,
                column_index: 0,
                origin_mm: PositionMm {
                    x_mm: 0,
                    y_mm: 0,
                    z_mm: 100,
                },
            },
            CandidateAnchorPosition {
                layer_index: 0,
                row_index: 0,
                column_index: 1,
                origin_mm: PositionMm {
                    x_mm: 100,
                    y_mm: 0,
                    z_mm: 0,
                },
            },
            CandidateAnchorPosition {
                layer_index: 0,
                row_index: 1,
                column_index: 0,
                origin_mm: PositionMm {
                    x_mm: 0,
                    y_mm: 100,
                    z_mm: 0,
                },
            },
        ];

        for strategy in ANCHOR_SCAN_STRATEGIES {
            let ordered = order_candidate_anchor_positions(&anchors, *strategy);

            assert_eq!(ordered[0].origin_mm.z_mm, 0);
            assert_eq!(ordered[1].origin_mm.z_mm, 0);
            assert_eq!(ordered[2].origin_mm.z_mm, 100);
        }

        let row_first =
            order_candidate_anchor_positions(&anchors, AnchorScanStrategy::LayerRowColumn);
        let column_first =
            order_candidate_anchor_positions(&anchors, AnchorScanStrategy::LayerColumnRow);
        assert_ne!(row_first[0].origin_mm, column_first[0].origin_mm);
    }

    #[test]
    fn local_search_replaces_one_conflicting_anchor_with_two_better_anchors() {
        let mut request = basic_loading_space_request();
        request.loading_space.usable_space = DimensionsMm {
            length_mm: 400,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.quantity = 2;
        request.package.dimension = DimensionsMm {
            length_mm: 200,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;

        let orientation = get_vehicle_loading_orientations(
            request.package.dimension,
            request.package.can_rotate,
            request.package.can_invert,
        )[0];
        let anchors = vec![
            CandidateAnchorPosition {
                layer_index: 0,
                row_index: 0,
                column_index: 1,
                origin_mm: PositionMm {
                    x_mm: 100,
                    y_mm: 0,
                    z_mm: 0,
                },
            },
            CandidateAnchorPosition {
                layer_index: 0,
                row_index: 0,
                column_index: 0,
                origin_mm: PositionMm {
                    x_mm: 0,
                    y_mm: 0,
                    z_mm: 0,
                },
            },
            CandidateAnchorPosition {
                layer_index: 0,
                row_index: 0,
                column_index: 2,
                origin_mm: PositionMm {
                    x_mm: 200,
                    y_mm: 0,
                    z_mm: 0,
                },
            },
        ];
        let (initial, rejection_summary) =
            build_greedy_anchor_placements(&request, orientation, &anchors);

        assert_eq!(initial.len(), 1);
        assert_eq!(initial[0].position_mm.x_mm, 100);
        assert_eq!(rejection_summary.evaluated_anchor_count, 3);
        assert_eq!(rejection_summary.accepted_anchor_count, 1);
        assert_eq!(rejection_summary.collision_rejection_count, 2);

        let refined = refine_greedy_anchor_placements(
            &request,
            orientation,
            &anchors,
            initial,
            request.package.quantity,
            normalized_blocked_spaces(&request),
        );

        assert_eq!(refined.len(), 2);
        assert_eq!(
            refined
                .iter()
                .map(|placement| placement.position_mm.x_mm)
                .collect::<Vec<_>>(),
            vec![0, 200]
        );
    }

    #[test]
    fn rejects_when_package_cannot_fit_any_orientation() {
        let mut request = basic_request();
        request.package.dimension = DimensionsMm {
            length_mm: 2_000,
            width_mm: 2_000,
            height_mm: 2_000,
        };

        let error = plan_vehicle_loading(&request).expect_err("package should not fit");

        assert_eq!(error, VehicleLoadingError::PackageCannotFit);
    }

    #[test]
    fn diagnoses_oversized_orientation_without_running_anchor_scan() {
        let mut request = basic_loading_space_request();
        request.package.dimension = DimensionsMm {
            length_mm: 2_100,
            width_mm: 500,
            height_mm: 500,
        };
        request.package.can_rotate = false;

        let diagnostics =
            diagnose_loading_space_plan(&request).expect("diagnostics should be generated");

        assert_eq!(
            diagnostics.schema_version,
            LOADING_PLAN_DIAGNOSTICS_SCHEMA_VERSION
        );
        assert_eq!(diagnostics.failure_code, "PACKAGE_CANNOT_FIT");
        assert_eq!(diagnostics.orientations.len(), 1);
        assert_eq!(
            diagnostics.orientations[0].reason_code,
            "PACKAGE_HORIZONTAL_DIMENSION_EXCEEDS_LOADING_SPACE"
        );
        assert_eq!(diagnostics.orientations[0].candidate_anchor_count, 0);
    }

    #[test]
    fn diagnoses_payload_failure_separately_from_geometry_failure() {
        let mut request = basic_loading_space_request();
        request.loading_space.payload_kg = 5.0;
        request.package.unit_weight_kg = 10.0;

        let diagnostics =
            diagnose_loading_space_plan(&request).expect("diagnostics should be generated");

        assert_eq!(diagnostics.failure_code, "PACKAGE_CANNOT_FIT");
        assert!(diagnostics
            .orientations
            .iter()
            .all(|orientation| orientation.reason_code == "PAYLOAD_CANNOT_CARRY_ONE_BOX"));
        assert!(diagnostics
            .orientations
            .iter()
            .all(|orientation| orientation.max_boxes_by_weight == 0));
    }

    #[test]
    fn enforces_placement_output_limit() {
        let mut request = basic_request();
        request.limits = Some(VehicleLoadingSearchLimits {
            max_placement_output: Some(4),
            max_grid_cell_scan: None,
            collision_clearance_mm: None,
            boundary_clearance_mm: None,
        });

        let error = plan_vehicle_loading(&request).expect_err("limit should reject output");

        assert_eq!(
            error,
            VehicleLoadingError::PlacementOutputLimitExceeded {
                actual: 8,
                maximum: 4
            }
        );
    }

    #[test]
    fn blocked_space_reduces_available_grid_capacity() {
        let mut request = basic_request();
        request.package.quantity = 8;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "wheel-well-left".to_owned(),
            kind: "wheelWell".to_owned(),
            origin_mm: PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 600,
                width_mm: 500,
                height_mm: 500,
            },
            obb: None,
        }]);

        let plan = plan_vehicle_loading(&request).expect("plan should be generated");

        assert_eq!(plan.max_boxes_per_vehicle, 7);
        assert_eq!(plan.grid.available_positions, 7);
        assert_eq!(plan.grid.blocked_positions, 1);
        assert_eq!(plan.placements.len(), 7);
        assert!(!plan.placements.iter().any(|placement| {
            placement.position_mm
                == PositionMm {
                    x_mm: 0,
                    y_mm: 0,
                    z_mm: 0,
                }
        }));
        assert!(plan
            .warnings
            .iter()
            .any(|warning| warning.code == "BLOCKED_SPACE_REDUCED_CAPACITY"));
    }

    #[test]
    fn stacks_boxes_when_each_upper_box_is_fully_supported() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 300,
        };
        request.package.quantity = 3;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;

        let plan = plan_vehicle_loading(&request).expect("supported stack should fit");

        assert_eq!(plan.max_boxes_per_vehicle, 3);
        assert_eq!(plan.placements.len(), 3);
        assert!(plan.placements.iter().any(|placement| {
            placement.position_mm
                == PositionMm {
                    x_mm: 0,
                    y_mm: 0,
                    z_mm: 200,
                }
        }));
    }

    #[test]
    fn supportable_obstacle_top_creates_horizontal_support_plane() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 200,
        };
        request.package.quantity = 1;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "wheel-well".to_owned(),
            kind: "wheelWell".to_owned(),
            origin_mm: PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            obb: None,
        }]);

        let plan = plan_vehicle_loading(&request)
            .expect("supportable obstacle top should create a flat plane");

        assert_eq!(plan.max_boxes_per_vehicle, 1);
        assert_eq!(plan.placements.len(), 1);
        assert_eq!(
            plan.placements[0].position_mm,
            PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 100,
            }
        );
    }

    #[test]
    fn horizontal_obb_obstacle_top_creates_oriented_support_plane() {
        let blocked_space = LoadingSpaceBlockedSpaceInput {
            id: "rotated-platform".to_owned(),
            kind: "obstacle".to_owned(),
            origin_mm: PositionMm {
                x_mm: 15,
                y_mm: 15,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 170,
                width_mm: 170,
                height_mm: 100,
            },
            obb: Some(LoadingSpaceObbInput {
                center_mm: [100.0, 100.0, 50.0],
                half_extents_mm: [60.0, 60.0, 50.0],
                axes: [
                    [0.7071067811865476, 0.7071067811865476, 0.0],
                    [-0.7071067811865476, 0.7071067811865476, 0.0],
                    [0.0, 0.0, 1.0],
                ],
            }),
        };

        assert!(matches!(
            blocked_space_horizontal_support_surface(&blocked_space, 100),
            Some(HorizontalSupportSurface::OrientedTop { .. })
        ));
        assert!(placement_has_horizontal_support_plane(
            PositionMm {
                x_mm: 80,
                y_mm: 80,
                z_mm: 100,
            },
            DimensionsMm {
                length_mm: 40,
                width_mm: 40,
                height_mm: 50,
            },
            &[],
            &[blocked_space.clone()],
        ));
        assert!(!placement_has_horizontal_support_plane(
            PositionMm {
                x_mm: 20,
                y_mm: 20,
                z_mm: 100,
            },
            DimensionsMm {
                length_mm: 40,
                width_mm: 40,
                height_mm: 50,
            },
            &[],
            &[blocked_space],
        ));
    }

    #[test]
    fn tilted_obb_obstacle_top_does_not_create_horizontal_support_plane() {
        let blocked_space = LoadingSpaceBlockedSpaceInput {
            id: "tilted-platform".to_owned(),
            kind: "obstacle".to_owned(),
            origin_mm: PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 120,
                width_mm: 100,
                height_mm: 140,
            },
            obb: Some(LoadingSpaceObbInput {
                center_mm: [60.0, 50.0, 70.0],
                half_extents_mm: [50.0, 50.0, 50.0],
                axes: [
                    [0.8660254037844386, 0.0, -0.5],
                    [0.0, 1.0, 0.0],
                    [0.5, 0.0, 0.8660254037844386],
                ],
            }),
        };

        assert!(blocked_space_horizontal_support_surface(&blocked_space, 100).is_none());
    }

    #[test]
    fn horizontal_clearance_requires_a_gap_without_breaking_stacking() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 300,
            width_mm: 102,
            height_mm: 100,
        };
        request.package.quantity = 3;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.limits = Some(VehicleLoadingSearchLimits {
            max_placement_output: None,
            max_grid_cell_scan: None,
            collision_clearance_mm: Some(1),
            boundary_clearance_mm: None,
        });

        let plan = plan_vehicle_loading(&request).expect("clearance plan should be generated");

        assert_eq!(plan.max_boxes_per_vehicle, 2);
        assert_eq!(
            plan.placements
                .iter()
                .map(|placement| placement.position_mm.x_mm)
                .collect::<Vec<_>>(),
            vec![0, 101]
        );
    }

    #[test]
    fn grid_counts_last_clearance_slot_without_requiring_trailing_gap() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 302,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.quantity = 3;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.limits = Some(VehicleLoadingSearchLimits {
            max_placement_output: None,
            max_grid_cell_scan: None,
            collision_clearance_mm: Some(1),
            boundary_clearance_mm: None,
        });

        let plan = plan_vehicle_loading(&request).expect("clearance plan should fit");

        assert_eq!(plan.max_boxes_per_vehicle, 3);
        assert_eq!(plan.grid.boxes_along_length, 3);
        assert_eq!(plan.grid.boxes_per_layer, 3);
        assert_eq!(plan.grid.available_positions, 3);
        assert_eq!(
            plan.placements
                .iter()
                .map(|placement| placement.position_mm.x_mm)
                .collect::<Vec<_>>(),
            vec![0, 101, 202]
        );
    }

    #[test]
    fn boundary_clearance_keeps_boxes_away_from_horizontal_walls() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 300,
            width_mm: 102,
            height_mm: 100,
        };
        request.package.quantity = 3;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.limits = Some(VehicleLoadingSearchLimits {
            max_placement_output: None,
            max_grid_cell_scan: None,
            collision_clearance_mm: None,
            boundary_clearance_mm: Some(1),
        });

        let plan = plan_vehicle_loading(&request).expect("boundary clearance plan should fit");

        assert_eq!(plan.max_boxes_per_vehicle, 2);
        assert!(plan.placements.iter().all(|placement| {
            placement.position_mm.x_mm >= 1
                && placement.position_mm.x_mm + placement.dimension.length_mm + 1 <= 300
                && placement.position_mm.y_mm >= 1
                && placement.position_mm.y_mm + placement.dimension.width_mm + 1 <= 102
        }));
    }

    #[test]
    fn adjacent_support_surfaces_can_jointly_support_one_box() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 200,
            width_mm: 100,
            height_mm: 200,
        };
        request.package.quantity = 1;
        request.package.dimension = DimensionsMm {
            length_mm: 200,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![
            VehicleLoadingBlockedSpaceInput {
                id: "left-support".to_owned(),
                kind: "obstacle".to_owned(),
                origin_mm: PositionMm {
                    x_mm: 0,
                    y_mm: 0,
                    z_mm: 0,
                },
                dimension: DimensionsMm {
                    length_mm: 100,
                    width_mm: 100,
                    height_mm: 100,
                },
                obb: None,
            },
            VehicleLoadingBlockedSpaceInput {
                id: "right-support".to_owned(),
                kind: "obstacle".to_owned(),
                origin_mm: PositionMm {
                    x_mm: 100,
                    y_mm: 0,
                    z_mm: 0,
                },
                dimension: DimensionsMm {
                    length_mm: 100,
                    width_mm: 100,
                    height_mm: 100,
                },
                obb: None,
            },
        ]);

        let plan =
            plan_vehicle_loading(&request).expect("adjacent obstacle tops should jointly support");

        assert_eq!(plan.max_boxes_per_vehicle, 1);
        assert_eq!(
            plan.placements[0].position_mm,
            PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 100
            }
        );
    }

    #[test]
    fn keep_out_top_does_not_create_horizontal_support_plane() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 200,
        };
        request.package.quantity = 1;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "keep-out-platform".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            obb: None,
        }]);

        let error = plan_vehicle_loading(&request)
            .expect_err("keep-out top should not create a support plane");

        assert_eq!(error, VehicleLoadingError::PackageCannotFit);
    }

    #[test]
    fn partial_horizontal_support_does_not_allow_upper_placement() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 200,
            width_mm: 100,
            height_mm: 200,
        };
        request.package.quantity = 1;
        request.package.dimension = DimensionsMm {
            length_mm: 200,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "partial-support".to_owned(),
            kind: "obstacle".to_owned(),
            origin_mm: PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            obb: None,
        }]);

        let error = plan_vehicle_loading(&request)
            .expect_err("partial support should not allow an upper placement");

        assert_eq!(error, VehicleLoadingError::PackageCannotFit);
    }

    #[test]
    fn edge_touching_blocked_space_does_not_collide() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 300,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.quantity = 3;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "middle-zone".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 100,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            obb: None,
        }]);

        let plan = plan_vehicle_loading(&request).expect("edge-touching boxes should fit");

        assert_eq!(plan.max_boxes_per_vehicle, 2);
        assert_eq!(plan.placements.len(), 2);
        assert!(plan.placements.iter().any(|placement| {
            placement.position_mm
                == PositionMm {
                    x_mm: 0,
                    y_mm: 0,
                    z_mm: 0,
                }
        }));
        assert!(plan.placements.iter().any(|placement| {
            placement.position_mm
                == PositionMm {
                    x_mm: 200,
                    y_mm: 0,
                    z_mm: 0,
                }
        }));
    }

    #[test]
    fn face_edge_and_corner_touching_boxes_do_not_collide() {
        let dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        let origin = PositionMm {
            x_mm: 0,
            y_mm: 0,
            z_mm: 0,
        };

        assert!(!aabb_intersects(
            origin,
            dimension,
            PositionMm {
                x_mm: 100,
                y_mm: 0,
                z_mm: 0,
            },
            dimension,
        ));
        assert!(!aabb_intersects(
            origin,
            dimension,
            PositionMm {
                x_mm: 100,
                y_mm: 100,
                z_mm: 0,
            },
            dimension,
        ));
        assert!(!aabb_intersects(
            origin,
            dimension,
            PositionMm {
                x_mm: 100,
                y_mm: 100,
                z_mm: 100,
            },
            dimension,
        ));
        assert!(aabb_intersects(
            origin,
            dimension,
            PositionMm {
                x_mm: 99,
                y_mm: 0,
                z_mm: 0,
            },
            dimension,
        ));
    }

    #[test]
    fn overflowing_intervals_fail_closed_as_collisions() {
        assert!(intervals_overlap(u32::MAX - 1, 2, 0, 1));
        assert!(intervals_overlap(0, 1, u32::MAX - 1, 2));
        assert!(!intervals_overlap(0, 0, 0, 100));
    }

    #[test]
    fn keep_out_kind_variants_never_create_support_planes() {
        for kind in ["keepOut", "keep-out", "keep_out", " KEEP OUT "] {
            let mut request = basic_request();
            request.vehicle.usable_space = DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 200,
            };
            request.package.quantity = 1;
            request.package.dimension = DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            };
            request.package.can_rotate = false;
            request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
                id: format!("keep-out-{kind}"),
                kind: kind.to_owned(),
                origin_mm: PositionMm {
                    x_mm: 0,
                    y_mm: 0,
                    z_mm: 0,
                },
                dimension: DimensionsMm {
                    length_mm: 100,
                    width_mm: 100,
                    height_mm: 100,
                },
                obb: None,
            }]);

            let error = plan_vehicle_loading(&request)
                .expect_err("keep-out variants must not support upper placement");

            assert_eq!(error, VehicleLoadingError::PackageCannotFit);
        }
    }

    #[test]
    fn generated_placement_validator_rejects_one_millimeter_overlap() {
        let request = basic_loading_space_request();
        let orientation = get_vehicle_loading_orientations(
            request.package.dimension,
            request.package.can_rotate,
            request.package.can_invert,
        )[0];
        let placements = vec![
            LoadingPlacement {
                package_index: 0,
                layer_index: 0,
                row_index: 0,
                column_index: 0,
                position_mm: PositionMm {
                    x_mm: 0,
                    y_mm: 0,
                    z_mm: 0,
                },
                dimension: orientation.dimension,
                orientation_label: orientation.label,
            },
            LoadingPlacement {
                package_index: 1,
                layer_index: 0,
                row_index: 0,
                column_index: 1,
                position_mm: PositionMm {
                    x_mm: 599,
                    y_mm: 0,
                    z_mm: 0,
                },
                dimension: orientation.dimension,
                orientation_label: orientation.label,
            },
        ];

        let error = validate_generated_placements(&request, orientation, &placements)
            .expect_err("one millimeter overlap must fail final validation");

        assert!(error.contains("碰撞"));
    }

    #[test]
    fn one_millimeter_overlap_with_blocked_space_collides() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 300,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.quantity = 1;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "one-mm-overlap-zone".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 99,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 102,
                width_mm: 100,
                height_mm: 100,
            },
            obb: None,
        }]);

        let error = plan_vehicle_loading(&request)
            .expect_err("1mm overlap should reject all candidate placements");

        assert_eq!(error, VehicleLoadingError::PackageCannotFit);
    }

    #[test]
    fn obb_blocked_space_uses_sat_instead_of_aabb_false_positive() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 250,
            width_mm: 250,
            height_mm: 100,
        };
        request.package.quantity = 1;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "rotated-narrow-obstacle".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 100,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 142,
                width_mm: 142,
                height_mm: 100,
            },
            obb: Some(LoadingSpaceObbInput {
                center_mm: [171.0, 71.0, 50.0],
                half_extents_mm: [10.0, 90.0, 50.0],
                axes: [
                    [0.7071067811865476, 0.7071067811865476, 0.0],
                    [-0.7071067811865476, 0.7071067811865476, 0.0],
                    [0.0, 0.0, 1.0],
                ],
            }),
        }]);

        let plan = plan_vehicle_loading(&request).expect("OBB should avoid AABB false positive");

        assert!(plan.placements.iter().any(|placement| {
            placement.position_mm
                == PositionMm {
                    x_mm: 0,
                    y_mm: 0,
                    z_mm: 0,
                }
        }));
    }

    #[test]
    fn obb_blocked_space_collision_returns_obb_witness() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.quantity = 1;
        request.package.dimension = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "rotated-obstacle".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 14,
                y_mm: 14,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 72,
                width_mm: 72,
                height_mm: 100,
            },
            obb: Some(LoadingSpaceObbInput {
                center_mm: [50.0, 50.0, 50.0],
                half_extents_mm: [25.0, 25.0, 50.0],
                axes: [
                    [0.7071067811865476, 0.7071067811865476, 0.0],
                    [-0.7071067811865476, 0.7071067811865476, 0.0],
                    [0.0, 0.0, 1.0],
                ],
            }),
        }]);

        let diagnostics =
            diagnose_vehicle_loading_plan(&request).expect("diagnostics should be generated");

        assert_eq!(diagnostics.failure_code, "PACKAGE_CANNOT_FIT");
        let witness = diagnostics.orientations[0]
            .rejection_summary
            .first_collision_witness
            .as_ref()
            .expect("OBB collision should expose a witness");
        assert_eq!(witness.kind, "blockedSpaceObb");
        assert_eq!(witness.other_id.as_deref(), Some("rotated-obstacle"));
    }

    #[test]
    fn rejects_obb_when_broad_aabb_escapes_blocked_space_envelope() {
        let mut request = basic_loading_space_request();
        request.loading_space.usable_space = DimensionsMm {
            length_mm: 200,
            width_mm: 200,
            height_mm: 100,
        };
        request.loading_space.blocked_spaces = Some(vec![LoadingSpaceBlockedSpaceInput {
            id: "escaped-obb".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            obb: Some(LoadingSpaceObbInput {
                center_mm: [90.0, 50.0, 50.0],
                half_extents_mm: [20.0, 50.0, 50.0],
                axes: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
            }),
        }]);

        let error = validate_loading_space_plan_request(&request)
            .expect_err("OBB broad AABB outside envelope should be rejected");

        assert!(matches!(
            error,
            VehicleLoadingError::BlockedSpaceInvalid(reason)
                if reason.contains("broad AABB")
        ));
    }

    #[test]
    fn allows_tiny_float_noise_in_obb_broad_aabb_envelope() {
        let mut request = basic_loading_space_request();
        request.loading_space.usable_space = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 100,
        };
        request.loading_space.blocked_spaces = Some(vec![LoadingSpaceBlockedSpaceInput {
            id: "noisy-obb".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            obb: Some(LoadingSpaceObbInput {
                center_mm: [50.00005, 50.0, 50.0],
                half_extents_mm: [50.0, 50.0, 50.0],
                axes: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
            }),
        }]);

        validate_loading_space_plan_request(&request)
            .expect("sub-tolerance OBB envelope float noise should be accepted");
    }

    #[test]
    fn candidate_anchors_use_obb_broad_aabb_edges_when_envelope_is_loose() {
        let mut request = basic_loading_space_request();
        request.loading_space.usable_space = DimensionsMm {
            length_mm: 100,
            width_mm: 100,
            height_mm: 20,
        };
        request.package.quantity = 1;
        request.package.dimension = DimensionsMm {
            length_mm: 20,
            width_mm: 20,
            height_mm: 20,
        };
        request.package.can_rotate = false;
        request.package.can_invert = false;
        request.loading_space.blocked_spaces = Some(vec![LoadingSpaceBlockedSpaceInput {
            id: "loose-envelope-obb".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 20,
                y_mm: 20,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 60,
                width_mm: 60,
                height_mm: 20,
            },
            obb: Some(LoadingSpaceObbInput {
                center_mm: [50.0, 50.0, 10.0],
                half_extents_mm: [10.0, 10.0, 10.0],
                axes: [
                    [0.7071067811865476, 0.7071067811865476, 0.0],
                    [-0.7071067811865476, 0.7071067811865476, 0.0],
                    [0.0, 0.0, 1.0],
                ],
            }),
        }]);
        let orientation = get_vehicle_loading_orientations(
            request.package.dimension,
            request.package.can_rotate,
            request.package.can_invert,
        )[0];

        let anchors = build_candidate_anchor_positions(&request, orientation)
            .expect("OBB anchors should be generated");
        let mut x_anchors = anchors
            .iter()
            .map(|anchor| anchor.origin_mm.x_mm)
            .collect::<Vec<_>>();
        x_anchors.sort_unstable();
        x_anchors.dedup();

        assert!(x_anchors.contains(&15));
        assert!(x_anchors.contains(&65));
        assert!(x_anchors.contains(&30));
        assert!(x_anchors.contains(&50));
    }

    #[test]
    fn obb_collision_allows_broad_aabb_corner_when_exact_shape_is_clear() {
        let blocked_space = LoadingSpaceBlockedSpaceInput {
            id: "rotated-obstacle".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 14,
                y_mm: 14,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 72,
                width_mm: 72,
                height_mm: 100,
            },
            obb: Some(LoadingSpaceObbInput {
                center_mm: [50.0, 50.0, 50.0],
                half_extents_mm: [25.0, 25.0, 50.0],
                axes: [
                    [0.7071067811865476, 0.7071067811865476, 0.0],
                    [-0.7071067811865476, 0.7071067811865476, 0.0],
                    [0.0, 0.0, 1.0],
                ],
            }),
        };

        assert!(!placement_intersects_blocked_space(
            PositionMm {
                x_mm: 14,
                y_mm: 14,
                z_mm: 0,
            },
            DimensionsMm {
                length_mm: 10,
                width_mm: 10,
                height_mm: 100,
            },
            &blocked_space,
            0,
        ));
        assert!(placement_intersects_blocked_space(
            PositionMm {
                x_mm: 45,
                y_mm: 45,
                z_mm: 0,
            },
            DimensionsMm {
                length_mm: 10,
                width_mm: 10,
                height_mm: 100,
            },
            &blocked_space,
            0,
        ));
    }

    #[test]
    fn obb_horizontal_clearance_turns_edge_touch_into_collision() {
        let blocked_space = LoadingSpaceBlockedSpaceInput {
            id: "axis-aligned-obb".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 100,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            obb: Some(LoadingSpaceObbInput {
                center_mm: [150.0, 50.0, 50.0],
                half_extents_mm: [50.0, 50.0, 50.0],
                axes: [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
            }),
        };

        assert!(!placement_intersects_blocked_space(
            PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            &blocked_space,
            0,
        ));
        assert!(placement_intersects_blocked_space(
            PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            &blocked_space,
            1,
        ));
        assert!(!placement_intersects_blocked_space(
            PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            DimensionsMm {
                length_mm: 99,
                width_mm: 100,
                height_mm: 100,
            },
            &blocked_space,
            1,
        ));
    }

    #[test]
    fn uses_blocked_space_edge_anchor_to_place_box_when_origin_grid_is_blocked() {
        let mut request = basic_request();
        request.vehicle.usable_space = DimensionsMm {
            length_mm: 900,
            width_mm: 500,
            height_mm: 500,
        };
        request.package.quantity = 1;
        request.package.dimension = DimensionsMm {
            length_mm: 400,
            width_mm: 500,
            height_mm: 500,
        };
        request.package.can_rotate = false;
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "non-aligned-divider".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 350,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 500,
                height_mm: 500,
            },
            obb: None,
        }]);

        let plan = plan_vehicle_loading(&request).expect("plan should use obstacle edge anchor");

        assert_eq!(plan.max_boxes_per_vehicle, 1);
        assert_eq!(plan.placements.len(), 1);
        assert_eq!(
            plan.placements[0].position_mm,
            PositionMm {
                x_mm: 450,
                y_mm: 0,
                z_mm: 0,
            }
        );
    }

    #[test]
    fn rejects_blocked_space_outside_vehicle_space() {
        let mut request = basic_request();
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "outside-zone".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 1_100,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 200,
                width_mm: 100,
                height_mm: 100,
            },
            obb: None,
        }]);

        let error = plan_vehicle_loading(&request)
            .expect_err("blocked space outside should reject request");

        assert_eq!(
            error,
            VehicleLoadingError::BlockedSpaceInvalid(
                "outside-zone 必须位于装载空间内部".to_owned()
            )
        );
    }

    #[test]
    fn enforces_grid_cell_scan_limit_when_blocked_space_collision_scan_is_required() {
        let mut request = basic_request();
        request.vehicle.blocked_spaces = Some(vec![VehicleLoadingBlockedSpaceInput {
            id: "small-keep-out".to_owned(),
            kind: "keepOut".to_owned(),
            origin_mm: PositionMm {
                x_mm: 0,
                y_mm: 0,
                z_mm: 0,
            },
            dimension: DimensionsMm {
                length_mm: 100,
                width_mm: 100,
                height_mm: 100,
            },
            obb: None,
        }]);
        request.limits = Some(VehicleLoadingSearchLimits {
            max_placement_output: None,
            max_grid_cell_scan: Some(7),
            collision_clearance_mm: None,
            boundary_clearance_mm: None,
        });

        let error = plan_vehicle_loading(&request)
            .expect_err("collision scan should respect configured limit");

        assert_eq!(
            error,
            VehicleLoadingError::GridCellScanLimitExceeded {
                actual: 27,
                maximum: 7
            }
        );
    }
}

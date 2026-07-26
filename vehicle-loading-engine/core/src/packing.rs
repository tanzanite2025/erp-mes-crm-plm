use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fmt::{Display, Formatter};

pub const VEHICLE_LOADING_REQUEST_SCHEMA_VERSION: &str = "vehicle-loading-request.v1";
pub const VEHICLE_LOADING_PLAN_SCHEMA_VERSION: &str = "vehicle-loading-plan.v1";
pub const LOADING_SPACE_PLAN_REQUEST_SCHEMA_VERSION: &str = "loading-space-plan-request.v1";
pub const LOADING_SPACE_PLAN_SCHEMA_VERSION: &str = "loading-space-plan.v1";
pub const LOADING_SPACE_ENGINE_VERSION: &str = "loading-space-core-0.2.0";
pub const VEHICLE_LOADING_ENGINE_VERSION: &str = "vehicle-loading-core-0.2.0";

const DEFAULT_MAX_PLACEMENT_OUTPUT: u32 = 10_000;
const DEFAULT_MAX_GRID_CELL_SCAN: u32 = 1_000_000;
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
pub struct LoadingCandidateSummary {
    pub orientation_label: &'static str,
    pub yaw_degrees: u16,
    pub scan_strategy: &'static str,
    pub max_boxes_per_unit: u32,
    pub volume_rate: f64,
    pub weight_rate: f64,
    pub blocked_positions: u32,
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
    placements: Vec<LoadingPlacement>,
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
    placements: Vec<LoadingPlacement>,
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
    }
    Ok(())
}

fn dimensions_are_positive(dimensions: DimensionsMm) -> bool {
    dimensions.length_mm > 0 && dimensions.width_mm > 0 && dimensions.height_mm > 0
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
    }
}

fn build_candidate_plan_for_orientation(
    request: &LoadingSpacePlanRequest,
    orientation: LoadingOrientation,
) -> Result<Option<CandidatePlan>, VehicleLoadingError> {
    let loading_space = request.loading_space.usable_space;
    let package_dimension = orientation.dimension;
    if package_dimension.length_mm > loading_space.length_mm
        || package_dimension.width_mm > loading_space.width_mm
        || package_dimension.height_mm > loading_space.height_mm
    {
        return Ok(None);
    }

    let boxes_along_length = loading_space.length_mm / package_dimension.length_mm;
    let boxes_along_width = loading_space.width_mm / package_dimension.width_mm;
    let layer_count = loading_space.height_mm / package_dimension.height_mm;
    let boxes_per_layer = boxes_along_length.checked_mul(boxes_along_width).ok_or(
        VehicleLoadingError::GridCellScanLimitExceeded {
            actual: u32::MAX,
            maximum: max_grid_cell_scan(request),
        },
    )?;
    let candidate_anchor_positions = build_candidate_anchor_positions(request, orientation)?;
    let greedy_result =
        build_best_greedy_anchor_placements(request, orientation, &candidate_anchor_positions);
    let available_positions = greedy_result.placements.len().min(u32::MAX as usize) as u32;
    let blocked_positions = (candidate_anchor_positions.len().min(u32::MAX as usize) as u32)
        .saturating_sub(available_positions);
    let max_boxes_by_weight =
        (request.loading_space.payload_kg / request.package.unit_weight_kg).floor() as u32;
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
        placements: greedy_result
            .placements
            .into_iter()
            .take(max_boxes_per_unit as usize)
            .collect(),
    }))
}

fn candidate_is_better(candidate: &CandidatePlan, current: &CandidatePlan) -> bool {
    compare_u32(candidate.max_boxes_per_unit, current.max_boxes_per_unit)
        .then_with(|| compare_f64(candidate.volume_rate, current.volume_rate))
        .then_with(|| compare_f64(candidate.weight_rate, current.weight_rate))
        .then_with(|| compare_u32(candidate.grid.boxes_per_layer, current.grid.boxes_per_layer))
        == Ordering::Greater
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
    let x_anchors = build_axis_anchor_values(
        loading_space.length_mm,
        dimension.length_mm,
        normalized_blocked_spaces(request)
            .iter()
            .map(|blocked_space| {
                (
                    blocked_space.origin_mm.x_mm,
                    blocked_space.dimension.length_mm,
                )
            }),
    );
    let y_anchors = build_axis_anchor_values(
        loading_space.width_mm,
        dimension.width_mm,
        normalized_blocked_spaces(request)
            .iter()
            .map(|blocked_space| {
                (
                    blocked_space.origin_mm.y_mm,
                    blocked_space.dimension.width_mm,
                )
            }),
    );
    let z_anchors = build_axis_anchor_values(
        loading_space.height_mm,
        dimension.height_mm,
        normalized_blocked_spaces(request)
            .iter()
            .map(|blocked_space| {
                (
                    blocked_space.origin_mm.z_mm,
                    blocked_space.dimension.height_mm,
                )
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

fn build_axis_anchor_values(
    container_size_mm: u32,
    item_size_mm: u32,
    blocked_intervals: impl Iterator<Item = (u32, u32)>,
) -> Vec<u32> {
    let max_origin = container_size_mm.saturating_sub(item_size_mm);
    let mut values = Vec::new();
    let mut current = 0u32;

    while current <= max_origin {
        values.push(current);
        let Some(next) = current.checked_add(item_size_mm) else {
            break;
        };
        if next == current {
            break;
        }
        current = next;
    }

    values.push(max_origin);
    for (blocked_start, blocked_size) in blocked_intervals {
        let blocked_end = blocked_start.saturating_add(blocked_size);
        if blocked_start >= item_size_mm {
            values.push(blocked_start - item_size_mm);
        }
        if blocked_end <= max_origin {
            values.push(blocked_end);
        }
    }

    values.sort_unstable();
    values.dedup();
    values
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
) -> GreedyPlacementResult {
    let mut best_result = GreedyPlacementResult {
        scan_strategy: ANCHOR_SCAN_STRATEGIES[0],
        placements: Vec::new(),
    };

    for strategy in ANCHOR_SCAN_STRATEGIES {
        let ordered_anchor_positions =
            order_candidate_anchor_positions(candidate_anchor_positions, *strategy);
        let placements =
            build_greedy_anchor_placements(request, orientation, &ordered_anchor_positions);
        if placements.len() > best_result.placements.len() {
            best_result = GreedyPlacementResult {
                scan_strategy: *strategy,
                placements,
            };
        }
    }

    best_result
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
) -> Vec<LoadingPlacement> {
    let mut placements = Vec::new();
    for anchor in candidate_anchor_positions {
        if placement_collides_with_blocked_space(anchor.origin_mm, orientation.dimension, request) {
            continue;
        }
        if placement_collides_with_existing_placement(
            anchor.origin_mm,
            orientation.dimension,
            &placements,
        ) {
            continue;
        }
        if !placement_has_horizontal_support_plane(
            anchor.origin_mm,
            &placements,
            normalized_blocked_spaces(request),
        ) {
            continue;
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
    }
    placements
}

fn placement_has_horizontal_support_plane(
    origin_mm: PositionMm,
    placements: &[LoadingPlacement],
    blocked_spaces: &[LoadingSpaceBlockedSpaceInput],
) -> bool {
    if origin_mm.z_mm == 0 {
        return true;
    }

    placements.iter().any(|placement| {
        placement
            .position_mm
            .z_mm
            .checked_add(placement.dimension.height_mm)
            == Some(origin_mm.z_mm)
    }) || blocked_spaces.iter().any(|blocked_space| {
        blocked_space_supports_horizontal_plane(blocked_space)
            && blocked_space
                .origin_mm
                .z_mm
                .checked_add(blocked_space.dimension.height_mm)
                == Some(origin_mm.z_mm)
    })
}

fn placement_collides_with_existing_placement(
    origin_mm: PositionMm,
    dimension: DimensionsMm,
    placements: &[LoadingPlacement],
) -> bool {
    placements.iter().any(|placement| {
        aabb_intersects(
            origin_mm,
            dimension,
            placement.position_mm,
            placement.dimension,
        )
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
    normalized_blocked_spaces(request)
        .iter()
        .any(|blocked_space| {
            aabb_intersects(
                origin_mm,
                dimension,
                blocked_space.origin_mm,
                blocked_space.dimension,
            )
        })
}

fn blocked_space_supports_horizontal_plane(blocked_space: &LoadingSpaceBlockedSpaceInput) -> bool {
    let kind = blocked_space.kind.trim();
    !kind.eq_ignore_ascii_case("keepOut") && !kind.eq_ignore_ascii_case("keep-out")
}

fn aabb_intersects(
    left_origin: PositionMm,
    left_dimension: DimensionsMm,
    right_origin: PositionMm,
    right_dimension: DimensionsMm,
) -> bool {
    intervals_overlap(
        left_origin.x_mm,
        left_dimension.length_mm,
        right_origin.x_mm,
        right_dimension.length_mm,
    ) && intervals_overlap(
        left_origin.y_mm,
        left_dimension.width_mm,
        right_origin.y_mm,
        right_dimension.width_mm,
    ) && intervals_overlap(
        left_origin.z_mm,
        left_dimension.height_mm,
        right_origin.z_mm,
        right_dimension.height_mm,
    )
}

fn intervals_overlap(left_start: u32, left_size: u32, right_start: u32, right_size: u32) -> bool {
    let left_end = left_start.saturating_add(left_size);
    let right_end = right_start.saturating_add(right_size);
    left_start < right_end && left_end > right_start
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
    fn enforces_placement_output_limit() {
        let mut request = basic_request();
        request.limits = Some(VehicleLoadingSearchLimits {
            max_placement_output: Some(4),
            max_grid_cell_scan: None,
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
        }]);

        let error = plan_vehicle_loading(&request)
            .expect_err("keep-out top should not create a support plane");

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
        }]);

        let error = plan_vehicle_loading(&request)
            .expect_err("1mm overlap should reject all candidate placements");

        assert_eq!(error, VehicleLoadingError::PackageCannotFit);
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
        }]);
        request.limits = Some(VehicleLoadingSearchLimits {
            max_placement_output: None,
            max_grid_cell_scan: Some(7),
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

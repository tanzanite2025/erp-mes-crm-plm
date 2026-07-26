import type { VehicleModelTemplate } from '../../shared/vehicle-model-template.types'
import type {
  VehicleLoadingPreviewLayer,
  VehicleLoadingPreviewScene,
  VehicleLoadingPreviewVehicleAllowance,
  VehicleLoadingPreviewVehicleLoadingConstraint,
} from '../data/vehicle-loading-preview-scene.types'
import type { VehicleLoadingGeometryProjection } from '../data/vehicle-loading-wasm-geometry.types'
import type {
  VehicleLoadingPlan,
  VehicleLoadingPlanOrientation,
  VehicleLoadingPlanPlacement,
  VehicleLoadingPlanRequest,
} from '../data/vehicle-loading-wasm-plan.types'
import type { VehicleLoadingOrientation } from '../data/vehicle-loading.types'
import { buildVehicleLoadingLayoutSnapshotFromVehiclePlan } from './vehicle-loading-layout-snapshot'

const EMPTY_VEHICLE_SAFETY_ALLOWANCE: VehicleLoadingPreviewVehicleAllowance = {
  topClearanceMm: 0,
  sideClearanceMm: 0,
  rearClearanceMm: 0,
}

const EMPTY_VEHICLE_LOADING_CONSTRAINT: VehicleLoadingPreviewVehicleLoadingConstraint =
  {
    doorWidthMm: 0,
    doorHeightMm: 0,
    wheelArchWidthMm: 0,
    wheelArchHeightMm: 0,
    hasCenterPillar: false,
  }

type BuildVehicleLoadingPreviewSceneFromWasmPlanOptions = {
  request: VehicleLoadingPlanRequest
  plan: VehicleLoadingPlan
  vehicleName?: string
  vehicleSafetyAllowance?: VehicleLoadingPreviewVehicleAllowance
  vehicleLoadingConstraint?: VehicleLoadingPreviewVehicleLoadingConstraint
  modelTemplate?: VehicleModelTemplate
  modelTemplateSource?: VehicleLoadingPreviewScene['modelTemplateSource']
  geometryProjection?: VehicleLoadingGeometryProjection | null
}

function assertVehicleLoadingPlanMatchesRequest({
  request,
  plan,
}: Pick<
  BuildVehicleLoadingPreviewSceneFromWasmPlanOptions,
  'request' | 'plan'
>) {
  if (plan.vehicleId !== request.vehicle.id) {
    throw new Error(
      `装箱计划车型不匹配：请求为 ${request.vehicle.id}，计划为 ${plan.vehicleId}`
    )
  }
  if (plan.packageId !== request.package.id) {
    throw new Error(
      `装箱计划包装不匹配：请求为 ${request.package.id}，计划为 ${plan.packageId}`
    )
  }
}

function buildVehicleLoadingOrientationFromWasmPlanOrientation(
  orientation: VehicleLoadingPlanOrientation
): VehicleLoadingOrientation {
  return {
    label: orientation.label,
    lengthAxis: orientation.lengthAxis,
    widthAxis: orientation.widthAxis,
    heightAxis: orientation.heightAxis,
    lengthMm: orientation.dimension.lengthMm,
    widthMm: orientation.dimension.widthMm,
    heightMm: orientation.dimension.heightMm,
  }
}

function buildVehicleLoadingPreviewLayerPlacement(
  placement: VehicleLoadingPlanPlacement
) {
  return {
    packageIndex: placement.packageIndex,
    layerIndex: placement.layerIndex,
    rowIndex: placement.rowIndex,
    columnIndex: placement.columnIndex,
    positionMm: placement.positionMm,
    dimension: placement.dimension,
    orientationLabel: placement.orientationLabel,
  }
}

function buildVehicleLoadingPreviewLayersFromWasmPlan(
  plan: VehicleLoadingPlan
): VehicleLoadingPreviewLayer[] {
  const placementsByLayerIndex = new Map<
    number,
    VehicleLoadingPlanPlacement[]
  >()

  for (const placement of plan.placements) {
    const layerPlacements =
      placementsByLayerIndex.get(placement.layerIndex) ?? []
    layerPlacements.push(placement)
    placementsByLayerIndex.set(placement.layerIndex, layerPlacements)
  }

  return Array.from(
    { length: Math.max(plan.grid.layerCount, 1) },
    (_, layerIndex) => {
      const placements = placementsByLayerIndex.get(layerIndex) ?? []
      return {
        layerIndex,
        displayName: `第 ${layerIndex + 1} 层`,
        boxesInLayer: placements.length,
        usesRepeatedArrangement: false,
        placements: placements.map(buildVehicleLoadingPreviewLayerPlacement),
      }
    }
  )
}

function buildVehicleLoadingPreviewExplanationFromWasmPlan(
  plan: VehicleLoadingPlan,
  geometryProjection?: VehicleLoadingGeometryProjection | null
) {
  const warnings = plan.warnings.map((warning) => warning.message)
  const equivalentYawDegrees =
    plan.selectedOrientation.equivalentYawDegrees.length > 0
      ? plan.selectedOrientation.equivalentYawDegrees.join('/')
      : String(plan.selectedOrientation.yawDegrees)
  const geometryProjectionLines = geometryProjection
    ? [
        `车型几何投影：${geometryProjection.blockedSpaces.length} 个障碍区，屏蔽 ${plan.grid.blockedPositions} 个候选格位。`,
        ...geometryProjection.warnings.map((warning) => warning.message),
      ]
    : []
  return [
    `Rust/WASM 装箱计划：${plan.engineVersion}`,
    `单车最多 ${plan.maxBoxesPerVehicle} 箱，需要 ${plan.vehiclesNeeded} 车。`,
    `选中朝向：${plan.selectedOrientation.label}，yaw ${plan.selectedOrientation.yawDegrees}°，AABB 等价 yaw ${equivalentYawDegrees}°。`,
    `搜索摘要：评估 ${plan.search.evaluatedOrientationCount} 个朝向，每个朝向最多 ${plan.search.evaluatedScanStrategyCount} 种扫描顺序；${plan.search.candidateSummaries.length} 个可行候选，选中 ${plan.search.selectedScanStrategy}。`,
    `空间利用率 ${(plan.utilization.volumeRate * 100).toFixed(1)}%，重量利用率 ${(plan.utilization.weightRate * 100).toFixed(1)}%。`,
    ...geometryProjectionLines,
    ...warnings,
  ]
}

export function buildVehicleLoadingPreviewSceneFromWasmPlan({
  request,
  plan,
  vehicleName,
  vehicleSafetyAllowance = EMPTY_VEHICLE_SAFETY_ALLOWANCE,
  vehicleLoadingConstraint = EMPTY_VEHICLE_LOADING_CONSTRAINT,
  modelTemplate,
  modelTemplateSource,
  geometryProjection,
}: BuildVehicleLoadingPreviewSceneFromWasmPlanOptions): VehicleLoadingPreviewScene {
  assertVehicleLoadingPlanMatchesRequest({ request, plan })

  return {
    status: 'ready',
    renderer: 'layer-2d',
    vehicle: {
      name: vehicleName ?? request.vehicle.name ?? plan.vehicleId,
      size: request.vehicle.usableSpace,
      safetyAllowance: vehicleSafetyAllowance,
      loadingConstraint: vehicleLoadingConstraint,
    },
    modelTemplate,
    modelTemplateSource:
      modelTemplateSource ??
      (modelTemplate ? 'registered-template' : 'seed-vehicle-fallback'),
    packageBox: {
      size: request.package.dimension,
    },
    search: plan.search,
    layoutSnapshot: buildVehicleLoadingLayoutSnapshotFromVehiclePlan({
      id: `algorithm:${plan.vehicleId}:${plan.packageId}`,
      label: '算法方案',
      source: 'algorithm',
      request,
      plan,
    }),
    placement: {
      orientation: buildVehicleLoadingOrientationFromWasmPlanOrientation(
        plan.selectedOrientation
      ),
      boxesPerLayer: plan.grid.boxesPerLayer,
      layerCount: plan.grid.layerCount,
      maxBoxes: plan.maxBoxesPerVehicle,
    },
    layers: buildVehicleLoadingPreviewLayersFromWasmPlan(plan),
    explanation: buildVehicleLoadingPreviewExplanationFromWasmPlan(
      plan,
      geometryProjection
    ),
  }
}

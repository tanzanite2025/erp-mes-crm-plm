import type { VehicleModelTemplate } from '../../shared/vehicle-model-template.types'
import { buildVehicleModelTemplateFromVehicleSpec } from '../../vehicle-model-templates'
import type {
  VehicleLoadingPreviewLayer,
  VehicleLoadingPreviewScene,
} from '../data/vehicle-loading-preview-scene.types'
import type {
  VehicleLoadingOrientation,
  VehicleRecommendation,
} from '../data/vehicle-loading.types'

const EMPTY_PREVIEW_SIZE = {
  lengthMm: 0,
  widthMm: 0,
  heightMm: 0,
}

export function buildEmptyVehicleLoadingPreviewScene(): VehicleLoadingPreviewScene {
  return {
    status: 'empty',
    renderer: 'layer-2d',
    vehicle: {
      name: '装载示意',
      size: { ...EMPTY_PREVIEW_SIZE },
      safetyAllowance: {
        topClearanceMm: 0,
        sideClearanceMm: 0,
        rearClearanceMm: 0,
      },
      loadingConstraint: {
        doorWidthMm: 0,
        doorHeightMm: 0,
        wheelArchWidthMm: 0,
        wheelArchHeightMm: 0,
        hasCenterPillar: false,
      },
    },
    modelTemplateSource: 'seed-vehicle-fallback',
    packageBox: {
      size: { ...EMPTY_PREVIEW_SIZE },
    },
    placement: {
      orientation: {
        label: '当前推荐方案',
        lengthAxis: 'length',
        widthAxis: 'width',
        heightAxis: 'height',
        lengthMm: 0,
        widthMm: 0,
        heightMm: 0,
      },
      boxesPerLayer: 0,
      layerCount: 0,
      maxBoxes: 0,
    },
    layers: [],
    explanation: ['请选择一个推荐方案后再查看装箱预览。'],
  }
}

export function buildCalculatingVehicleLoadingPreviewScene(
  vehicleName = '装箱预览'
): VehicleLoadingPreviewScene {
  return {
    ...buildEmptyVehicleLoadingPreviewScene(),
    status: 'calculating',
    vehicle: {
      ...buildEmptyVehicleLoadingPreviewScene().vehicle,
      name: vehicleName,
    },
    explanation: ['WASM 装箱计算中，请稍候。'],
  }
}

export function buildFailedVehicleLoadingPreviewScene({
  vehicleName = '装箱预览',
  errorMessage,
}: {
  vehicleName?: string
  errorMessage: string
}): VehicleLoadingPreviewScene {
  return {
    ...buildEmptyVehicleLoadingPreviewScene(),
    status: 'failed',
    errorMessage,
    vehicle: {
      ...buildEmptyVehicleLoadingPreviewScene().vehicle,
      name: vehicleName,
    },
    explanation: [errorMessage],
  }
}

function buildVehicleLoadingPreviewExplanation(
  recommendation: VehicleRecommendation,
  orientation: VehicleLoadingOrientation
): string[] {
  return [
    recommendation.reason,
    recommendation.warning ?? '当前方案可直接查看示意图',
    orientation.label ? `推荐朝向：${orientation.label}` : '暂无朝向信息',
  ]
}

function buildRepeatedVehicleLoadingPreviewLayers(
  layerCount: number,
  boxesPerLayer: number
): VehicleLoadingPreviewLayer[] {
  return Array.from({ length: Math.max(layerCount, 1) }, (_, layerIndex) => ({
    layerIndex,
    displayName: `第 ${layerIndex + 1} 层`,
    boxesInLayer: boxesPerLayer,
    usesRepeatedArrangement: true,
  }))
}

export function buildVehicleLoadingPreviewSceneFromRecommendation(
  recommendation: VehicleRecommendation | null,
  modelTemplate?: VehicleModelTemplate
): VehicleLoadingPreviewScene {
  if (!recommendation) return buildEmptyVehicleLoadingPreviewScene()

  const orientation = recommendation.selectedOrientation
  const boxesPerLayer = recommendation.boxesPerLayer ?? 3
  const layerCount = recommendation.layerCount ?? 2

  return {
    status: 'ready',
    renderer: 'layer-2d',
    vehicle: {
      name: recommendation.vehicle.name,
      size: {
        lengthMm: recommendation.vehicle.usableInnerSize.lengthMm,
        widthMm: recommendation.vehicle.usableInnerSize.widthMm,
        heightMm: recommendation.vehicle.usableInnerSize.heightMm,
      },
      safetyAllowance: recommendation.vehicle.safetyAllowance,
      loadingConstraint: recommendation.vehicle.loadingConstraint,
    },
    modelTemplate:
      modelTemplate ??
      buildVehicleModelTemplateFromVehicleSpec({
        vehicleSpec: recommendation.vehicle,
      }),
    modelTemplateSource: modelTemplate
      ? 'registered-template'
      : 'seed-vehicle-fallback',
    packageBox: {
      size: {
        lengthMm: recommendation.packageDimension.lengthMm,
        widthMm: recommendation.packageDimension.widthMm,
        heightMm: recommendation.packageDimension.heightMm,
      },
    },
    placement: {
      orientation,
      boxesPerLayer,
      layerCount,
      maxBoxes: recommendation.maxBoxesPerVehicle ?? 6,
    },
    layers: buildRepeatedVehicleLoadingPreviewLayers(layerCount, boxesPerLayer),
    explanation: buildVehicleLoadingPreviewExplanation(
      recommendation,
      orientation
    ),
  }
}

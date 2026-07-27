import type { VehicleModelTemplate } from '../../shared/vehicle-model-template.types'
import type { VehicleLoadingLayoutSnapshot } from './vehicle-loading-layout-snapshot.types'
import type {
  VehicleLoadingPreviewPosition,
  VehicleLoadingPreviewSize,
  VehicleLoadingPreviewVehicleAllowance,
  VehicleLoadingPreviewVehicleLoadingConstraint,
} from './vehicle-loading-preview-geometry.types'
import type {
  LoadingPlanDiagnostics,
  LoadingSearchSummary,
} from './vehicle-loading-wasm-plan.types'
import type { VehicleLoadingOrientation } from './vehicle-loading.types'

export type {
  VehicleLoadingPreviewPosition,
  VehicleLoadingPreviewSize,
  VehicleLoadingPreviewVehicleAllowance,
  VehicleLoadingPreviewVehicleLoadingConstraint,
} from './vehicle-loading-preview-geometry.types'

export type VehicleLoadingPreviewPlacement = {
  orientation: VehicleLoadingOrientation
  boxesPerLayer: number
  layerCount: number
  maxBoxes: number
}

export type VehicleLoadingPreviewPlacedBox = {
  packageIndex: number
  layerIndex: number
  rowIndex: number
  columnIndex: number
  positionMm: VehicleLoadingPreviewPosition
  dimension: VehicleLoadingPreviewSize
  orientationLabel: string
}

export type VehicleLoadingPreviewLayer = {
  layerIndex: number
  displayName: string
  boxesInLayer: number
  usesRepeatedArrangement: boolean
  placements?: VehicleLoadingPreviewPlacedBox[]
}

export type VehicleLoadingReferenceComparisonSource =
  | 'manual-reference'
  | 'cad-reference'

export type VehicleLoadingReferenceComparisonInput = {
  id: string
  kind: VehicleLoadingReferenceComparisonSource
  label: string
  yawDegrees: number
  maxBoxesPerUnit: number
  volumeRate: number
  weightRate: number
  scanStrategy?: string
  blockedPositions?: number
}

export type VehicleLoadingPreviewScene = {
  status: 'empty' | 'calculating' | 'failed' | 'ready'
  renderer: 'layer-2d' | 'space-3d'
  errorMessage?: string
  diagnostics?: LoadingPlanDiagnostics
  vehicle: {
    name: string
    size: VehicleLoadingPreviewSize
    safetyAllowance: VehicleLoadingPreviewVehicleAllowance
    loadingConstraint: VehicleLoadingPreviewVehicleLoadingConstraint
  }
  modelTemplate?: VehicleModelTemplate
  modelTemplateSource: 'registered-template' | 'seed-vehicle-fallback'
  packageBox: {
    size: VehicleLoadingPreviewSize
  }
  search?: LoadingSearchSummary
  layoutSnapshot?: VehicleLoadingLayoutSnapshot
  referenceComparisons?: VehicleLoadingReferenceComparisonInput[]
  placement: VehicleLoadingPreviewPlacement
  layers: VehicleLoadingPreviewLayer[]
  explanation: string[]
}

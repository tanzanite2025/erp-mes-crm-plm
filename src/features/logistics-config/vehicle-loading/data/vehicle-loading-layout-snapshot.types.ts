import type {
  LoadingSearchSummary,
  VehicleLoadingPlanBlockedSpaceInput,
  VehicleLoadingPlanDimensionsMm,
  VehicleLoadingPlanOrientation,
  VehicleLoadingPlanPlacement,
  VehicleLoadingPlanRequest,
  VehicleLoadingPlanWarning,
} from './vehicle-loading-wasm-plan.types'

export const VEHICLE_LOADING_LAYOUT_SNAPSHOT_SCHEMA_VERSION =
  'vehicle-loading-layout-snapshot.v1'

export type VehicleLoadingLayoutSnapshotSource =
  | 'algorithm'
  | 'manual'
  | 'cad-reference'

export type VehicleLoadingLayoutSnapshotValidation = {
  status: 'valid' | 'invalid' | 'unchecked'
  messages: string[]
}

export type VehicleLoadingLayoutSnapshot = {
  schemaVersion: typeof VEHICLE_LOADING_LAYOUT_SNAPSHOT_SCHEMA_VERSION
  id: string
  label: string
  source: VehicleLoadingLayoutSnapshotSource
  engineVersion: string
  loadingSpaceId: string
  packageId: string
  usableSpace: VehicleLoadingPlanDimensionsMm
  blockedSpaces: VehicleLoadingPlanBlockedSpaceInput[]
  payloadKg: number
  packageInput: VehicleLoadingPlanRequest['package']
  requestedBoxes: number
  boxesPlacedInPreviewUnit: number
  remainingBoxesAfterPreviewUnit: number
  maxBoxesPerUnit: number
  unitsNeeded: number
  selectedOrientation: VehicleLoadingPlanOrientation
  utilization: {
    volumeRate: number
    weightRate: number
  }
  search: LoadingSearchSummary
  placements: readonly VehicleLoadingPlanPlacement[]
  warnings: readonly VehicleLoadingPlanWarning[]
  validation: VehicleLoadingLayoutSnapshotValidation
}

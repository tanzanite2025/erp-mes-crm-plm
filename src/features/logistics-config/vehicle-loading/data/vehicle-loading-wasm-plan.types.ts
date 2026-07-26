export const VEHICLE_LOADING_REQUEST_SCHEMA_VERSION =
  'vehicle-loading-request.v1'

export const VEHICLE_LOADING_PLAN_SCHEMA_VERSION = 'vehicle-loading-plan.v1'

export const LOADING_SPACE_PLAN_REQUEST_SCHEMA_VERSION =
  'loading-space-plan-request.v1'

export const LOADING_SPACE_PLAN_SCHEMA_VERSION = 'loading-space-plan.v1'

export type VehicleLoadingPlanDimensionsMm = {
  lengthMm: number
  widthMm: number
  heightMm: number
}

export type VehicleLoadingPlanPositionMm = {
  xMm: number
  yMm: number
  zMm: number
}

export type VehicleLoadingPlanBlockedSpaceInput = {
  id: string
  kind: string
  originMm: VehicleLoadingPlanPositionMm
  dimension: VehicleLoadingPlanDimensionsMm
}

export type VehicleLoadingPlanRequest = {
  schemaVersion: typeof VEHICLE_LOADING_REQUEST_SCHEMA_VERSION
  vehicle: {
    id: string
    name?: string
    usableSpace: VehicleLoadingPlanDimensionsMm
    blockedSpaces?: VehicleLoadingPlanBlockedSpaceInput[]
    payloadKg: number
  }
  package: {
    id: string
    name?: string
    quantity: number
    unitWeightKg: number
    dimension: VehicleLoadingPlanDimensionsMm
    canRotate: boolean
    canInvert: boolean
  }
  limits?: {
    maxPlacementOutput?: number
    maxGridCellScan?: number
  }
}

export type LoadingSpacePlanRequest = {
  schemaVersion: typeof LOADING_SPACE_PLAN_REQUEST_SCHEMA_VERSION
  loadingSpace: {
    id: string
    name?: string
    usableSpace: VehicleLoadingPlanDimensionsMm
    blockedSpaces?: VehicleLoadingPlanBlockedSpaceInput[]
    payloadKg: number
  }
  package: VehicleLoadingPlanRequest['package']
  limits?: VehicleLoadingPlanRequest['limits']
}

export type VehicleLoadingPlanOrientation = {
  label: string
  lengthAxis: 'length' | 'width' | 'height'
  widthAxis: 'length' | 'width' | 'height'
  heightAxis: 'length' | 'width' | 'height'
  yawDegrees: number
  equivalentYawDegrees: readonly number[]
  dimension: VehicleLoadingPlanDimensionsMm
}

export type VehicleLoadingPlanPlacement = {
  packageIndex: number
  layerIndex: number
  rowIndex: number
  columnIndex: number
  positionMm: VehicleLoadingPlanPositionMm
  dimension: VehicleLoadingPlanDimensionsMm
  orientationLabel: string
}

export type VehicleLoadingPlanWarning = {
  code: string
  message: string
}

export type LoadingSearchSummary = {
  evaluatedOrientationCount: number
  evaluatedScanStrategyCount: number
  selectedScanStrategy: string
  candidateSummaries: readonly LoadingCandidateSummary[]
}

export type LoadingCandidateSummary = {
  orientationLabel: string
  yawDegrees: number
  scanStrategy: string
  maxBoxesPerUnit: number
  volumeRate: number
  weightRate: number
  blockedPositions: number
}

export type VehicleLoadingPlan = {
  schemaVersion: typeof VEHICLE_LOADING_PLAN_SCHEMA_VERSION
  engineVersion: string
  vehicleId: string
  packageId: string
  requestedBoxes: number
  boxesPlacedInPreviewVehicle: number
  remainingBoxesAfterPreviewVehicle: number
  maxBoxesPerVehicle: number
  vehiclesNeeded: number
  selectedOrientation: VehicleLoadingPlanOrientation
  grid: {
    boxesAlongLength: number
    boxesAlongWidth: number
    layerCount: number
    boxesPerLayer: number
    availablePositions: number
    blockedPositions: number
  }
  utilization: {
    volumeRate: number
    weightRate: number
  }
  search: LoadingSearchSummary
  placements: readonly VehicleLoadingPlanPlacement[]
  warnings: readonly VehicleLoadingPlanWarning[]
}

export type LoadingSpacePlan = {
  schemaVersion: typeof LOADING_SPACE_PLAN_SCHEMA_VERSION
  engineVersion: string
  loadingSpaceId: string
  packageId: string
  requestedBoxes: number
  boxesPlacedInPreviewUnit: number
  remainingBoxesAfterPreviewUnit: number
  maxBoxesPerUnit: number
  unitsNeeded: number
  selectedOrientation: VehicleLoadingPlanOrientation
  grid: VehicleLoadingPlan['grid']
  utilization: VehicleLoadingPlan['utilization']
  search: LoadingSearchSummary
  placements: readonly VehicleLoadingPlanPlacement[]
  warnings: readonly VehicleLoadingPlanWarning[]
}

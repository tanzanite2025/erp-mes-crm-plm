import {
  VEHICLE_LOADING_LAYOUT_SNAPSHOT_SCHEMA_VERSION,
  type VehicleLoadingLayoutSnapshot,
  type VehicleLoadingLayoutSnapshotSource,
} from '../data/vehicle-loading-layout-snapshot.types'
import type {
  LoadingSpacePlan,
  LoadingSpacePlanRequest,
  VehicleLoadingPlan,
  VehicleLoadingPlanRequest,
} from '../data/vehicle-loading-wasm-plan.types'

type BuildVehicleLoadingLayoutSnapshotBaseOptions = {
  id: string
  label: string
  source: VehicleLoadingLayoutSnapshotSource
}

export function buildVehicleLoadingLayoutSnapshotFromVehiclePlan({
  id,
  label,
  source,
  request,
  plan,
}: BuildVehicleLoadingLayoutSnapshotBaseOptions & {
  request: VehicleLoadingPlanRequest
  plan: VehicleLoadingPlan
}): VehicleLoadingLayoutSnapshot {
  return {
    schemaVersion: VEHICLE_LOADING_LAYOUT_SNAPSHOT_SCHEMA_VERSION,
    id,
    label,
    source,
    engineVersion: plan.engineVersion,
    loadingSpaceId: plan.vehicleId,
    packageId: plan.packageId,
    usableSpace: request.vehicle.usableSpace,
    blockedSpaces: request.vehicle.blockedSpaces ?? [],
    payloadKg: request.vehicle.payloadKg,
    packageInput: request.package,
    requestedBoxes: plan.requestedBoxes,
    boxesPlacedInPreviewUnit: plan.boxesPlacedInPreviewVehicle,
    remainingBoxesAfterPreviewUnit: plan.remainingBoxesAfterPreviewVehicle,
    maxBoxesPerUnit: plan.maxBoxesPerVehicle,
    unitsNeeded: plan.vehiclesNeeded,
    selectedOrientation: plan.selectedOrientation,
    utilization: plan.utilization,
    search: plan.search,
    placements: plan.placements,
    warnings: plan.warnings,
    validation: {
      status: 'valid',
      messages: [],
    },
  }
}

export function buildVehicleLoadingLayoutSnapshotFromLoadingSpacePlan({
  id,
  label,
  source,
  request,
  plan,
}: BuildVehicleLoadingLayoutSnapshotBaseOptions & {
  request: LoadingSpacePlanRequest
  plan: LoadingSpacePlan
}): VehicleLoadingLayoutSnapshot {
  return {
    schemaVersion: VEHICLE_LOADING_LAYOUT_SNAPSHOT_SCHEMA_VERSION,
    id,
    label,
    source,
    engineVersion: plan.engineVersion,
    loadingSpaceId: plan.loadingSpaceId,
    packageId: plan.packageId,
    usableSpace: request.loadingSpace.usableSpace,
    blockedSpaces: request.loadingSpace.blockedSpaces ?? [],
    payloadKg: request.loadingSpace.payloadKg,
    packageInput: request.package,
    requestedBoxes: plan.requestedBoxes,
    boxesPlacedInPreviewUnit: plan.boxesPlacedInPreviewUnit,
    remainingBoxesAfterPreviewUnit: plan.remainingBoxesAfterPreviewUnit,
    maxBoxesPerUnit: plan.maxBoxesPerUnit,
    unitsNeeded: plan.unitsNeeded,
    selectedOrientation: plan.selectedOrientation,
    utilization: plan.utilization,
    search: plan.search,
    placements: plan.placements,
    warnings: plan.warnings,
    validation: {
      status: 'valid',
      messages: [],
    },
  }
}

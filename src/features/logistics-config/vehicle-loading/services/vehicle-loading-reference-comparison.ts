import type { VehicleLoadingLayoutSnapshot } from '../data/vehicle-loading-layout-snapshot.types'
import type {
  VehicleLoadingReferenceComparisonInput,
  VehicleLoadingReferenceComparisonSource,
} from '../data/vehicle-loading-preview-scene.types'
import type {
  LoadingSpacePlan,
  VehicleLoadingPlan,
} from '../data/vehicle-loading-wasm-plan.types'

type BuildVehicleLoadingReferenceComparisonOptions = {
  id: string
  kind: VehicleLoadingReferenceComparisonSource
  label: string
}

export function buildVehicleLoadingReferenceComparisonFromVehiclePlan({
  id,
  kind,
  label,
  plan,
}: BuildVehicleLoadingReferenceComparisonOptions & {
  plan: VehicleLoadingPlan
}): VehicleLoadingReferenceComparisonInput {
  return {
    id,
    kind,
    label,
    yawDegrees: plan.selectedOrientation.yawDegrees,
    maxBoxesPerUnit: plan.maxBoxesPerVehicle,
    volumeRate: plan.utilization.volumeRate,
    weightRate: plan.utilization.weightRate,
    scanStrategy: plan.search.selectedScanStrategy,
    blockedPositions: plan.grid.blockedPositions,
  }
}

export function buildVehicleLoadingReferenceComparisonFromLoadingSpacePlan({
  id,
  kind,
  label,
  plan,
}: BuildVehicleLoadingReferenceComparisonOptions & {
  plan: LoadingSpacePlan
}): VehicleLoadingReferenceComparisonInput {
  return {
    id,
    kind,
    label,
    yawDegrees: plan.selectedOrientation.yawDegrees,
    maxBoxesPerUnit: plan.maxBoxesPerUnit,
    volumeRate: plan.utilization.volumeRate,
    weightRate: plan.utilization.weightRate,
    scanStrategy: plan.search.selectedScanStrategy,
    blockedPositions: plan.grid.blockedPositions,
  }
}

export function buildVehicleLoadingReferenceComparisonFromLayoutSnapshot(
  snapshot: VehicleLoadingLayoutSnapshot
): VehicleLoadingReferenceComparisonInput {
  const kind: VehicleLoadingReferenceComparisonSource =
    snapshot.source === 'cad-reference' ? 'cad-reference' : 'manual-reference'

  return {
    id: snapshot.id,
    kind,
    label: snapshot.label,
    yawDegrees: snapshot.selectedOrientation.yawDegrees,
    maxBoxesPerUnit: snapshot.maxBoxesPerUnit,
    volumeRate: snapshot.utilization.volumeRate,
    weightRate: snapshot.utilization.weightRate,
    scanStrategy: snapshot.search.selectedScanStrategy,
    blockedPositions: snapshot.search.candidateSummaries.find(
      (candidate) =>
        candidate.orientationLabel === snapshot.selectedOrientation.label &&
        candidate.scanStrategy === snapshot.search.selectedScanStrategy
    )?.blockedPositions,
  }
}

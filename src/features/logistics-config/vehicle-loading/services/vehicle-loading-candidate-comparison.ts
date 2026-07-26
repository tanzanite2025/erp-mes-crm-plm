import type { VehicleLoadingReferenceComparisonInput } from '../data/vehicle-loading-preview-scene.types'
import type { LoadingCandidateSummary } from '../data/vehicle-loading-wasm-plan.types'

export type VehicleLoadingCandidateComparisonKind =
  | 'algorithm-selected'
  | 'algorithm-candidate'
  | VehicleLoadingReferenceComparisonInput['kind']

export type VehicleLoadingCandidateComparisonRow = {
  id: string
  kind: VehicleLoadingCandidateComparisonKind
  label: string
  yawDegrees: number
  scanStrategy?: string
  maxBoxesPerUnit: number
  boxDelta: number
  volumeRate: number
  weightRate: number
  blockedPositions?: number
}

type BuildVehicleLoadingCandidateComparisonRowsOptions = {
  candidateSummaries: readonly LoadingCandidateSummary[]
  referenceSummaries?: VehicleLoadingReferenceComparisonInput[]
  selectedOrientationLabel: string
  selectedScanStrategy?: string
  selectedMaxBoxesPerUnit: number
}

export function buildVehicleLoadingCandidateComparisonRows({
  candidateSummaries,
  referenceSummaries = [],
  selectedOrientationLabel,
  selectedScanStrategy,
  selectedMaxBoxesPerUnit,
}: BuildVehicleLoadingCandidateComparisonRowsOptions): VehicleLoadingCandidateComparisonRow[] {
  const algorithmRows = candidateSummaries.map<VehicleLoadingCandidateComparisonRow>((candidate) => {
    const isSelected =
      candidate.orientationLabel === selectedOrientationLabel &&
      candidate.scanStrategy === selectedScanStrategy

    return {
      id: `algorithm:${candidate.orientationLabel}:${candidate.scanStrategy}`,
      kind: isSelected ? 'algorithm-selected' : 'algorithm-candidate',
      label: candidate.orientationLabel,
      yawDegrees: candidate.yawDegrees,
      scanStrategy: candidate.scanStrategy,
      maxBoxesPerUnit: candidate.maxBoxesPerUnit,
      boxDelta: candidate.maxBoxesPerUnit - selectedMaxBoxesPerUnit,
      volumeRate: candidate.volumeRate,
      weightRate: candidate.weightRate,
      blockedPositions: candidate.blockedPositions,
    }
  })

  const referenceRows = referenceSummaries.map((reference) => ({
    ...reference,
    boxDelta: reference.maxBoxesPerUnit - selectedMaxBoxesPerUnit,
  }))

  return [...algorithmRows, ...referenceRows]
}

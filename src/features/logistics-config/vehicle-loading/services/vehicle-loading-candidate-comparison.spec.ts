import { describe, expect, it } from 'vitest'
import type { LoadingPlacementRejectionSummary } from '../data/vehicle-loading-wasm-plan.types'
import { buildVehicleLoadingCandidateComparisonRows } from './vehicle-loading-candidate-comparison'

describe('vehicle loading candidate comparison rows', () => {
  it('marks selected algorithm candidate and compares references against it', () => {
    const rows = buildVehicleLoadingCandidateComparisonRows({
      selectedOrientationLabel: 'W-L-H',
      selectedScanStrategy: 'layer-column-row',
      selectedMaxBoxesPerUnit: 10,
      candidateSummaries: [
        {
          orientationLabel: 'L-W-H',
          yawDegrees: 0,
          scanStrategy: 'layer-row-column',
          maxBoxesPerUnit: 8,
          volumeRate: 0.48,
          weightRate: 0.4,
          blockedPositions: 2,
        },
        {
          orientationLabel: 'W-L-H',
          yawDegrees: 90,
          scanStrategy: 'layer-column-row',
          maxBoxesPerUnit: 10,
          volumeRate: 0.6,
          weightRate: 0.5,
          blockedPositions: 1,
        },
      ],
      referenceSummaries: [
        {
          id: 'manual:layout-a',
          kind: 'manual-reference',
          label: '人工最优 A',
          yawDegrees: 90,
          maxBoxesPerUnit: 11,
          volumeRate: 0.66,
          weightRate: 0.55,
        },
      ],
    })

    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      kind: 'algorithm-candidate',
      boxDelta: -2,
    })
    expect(rows[1]).toMatchObject({
      kind: 'algorithm-selected',
      boxDelta: 0,
    })
    expect(rows[2]).toMatchObject({
      kind: 'manual-reference',
      boxDelta: 1,
    })
  })

  it('preserves collision diagnostics for the selected algorithm candidate', () => {
    const rejectionSummary: LoadingPlacementRejectionSummary = {
      evaluatedAnchorCount: 3,
      acceptedAnchorCount: 2,
      boundaryRejectionCount: 0,
      blockedSpaceRejectionCount: 0,
      collisionRejectionCount: 1,
      supportRejectionCount: 0,
      firstCollisionWitness: {
        kind: 'placement',
        anchorMm: { xMm: 200, yMm: 0, zMm: 0 },
        dimension: { lengthMm: 100, widthMm: 100, heightMm: 100 },
        otherId: 'package-1',
        otherOriginMm: { xMm: 101, yMm: 0, zMm: 0 },
        otherDimension: { lengthMm: 100, widthMm: 100, heightMm: 100 },
        clearanceMm: 1,
      },
    }

    const [row] = buildVehicleLoadingCandidateComparisonRows({
      selectedOrientationLabel: 'L-W-H',
      selectedScanStrategy: 'layer-row-column',
      selectedMaxBoxesPerUnit: 2,
      candidateSummaries: [
        {
          orientationLabel: 'L-W-H',
          yawDegrees: 0,
          scanStrategy: 'layer-row-column',
          maxBoxesPerUnit: 2,
          volumeRate: 0.5,
          weightRate: 0.5,
          blockedPositions: 1,
          rejectionSummary,
        },
      ],
    })

    expect(row.rejectionSummary).toEqual(rejectionSummary)
  })
})

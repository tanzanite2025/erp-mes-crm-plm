import { describe, expect, it } from 'vitest'
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
})

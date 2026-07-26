import { describe, expect, it } from 'vitest'
import type { VehicleLoadingLayoutSnapshot } from '../data/vehicle-loading-layout-snapshot.types'
import {
  parseVehicleLoadingLayoutSnapshotJson,
  serializeVehicleLoadingLayoutSnapshot,
  VehicleLoadingLayoutSnapshotJsonError,
} from './vehicle-loading-layout-snapshot-json'

const snapshot: VehicleLoadingLayoutSnapshot = {
  schemaVersion: 'vehicle-loading-layout-snapshot.v1',
  id: 'snapshot-a',
  label: '算法方案',
  source: 'algorithm',
  engineVersion: 'loading-space-core-test',
  loadingSpaceId: 'container-a',
  packageId: 'box-a',
  usableSpace: {
    lengthMm: 1200,
    widthMm: 1000,
    heightMm: 800,
  },
  blockedSpaces: [],
  payloadKg: 1000,
  packageInput: {
    id: 'box-a',
    quantity: 12,
    unitWeightKg: 10,
    dimension: {
      lengthMm: 500,
      widthMm: 600,
      heightMm: 400,
    },
    canRotate: true,
    canInvert: false,
  },
  requestedBoxes: 12,
  boxesPlacedInPreviewUnit: 9,
  remainingBoxesAfterPreviewUnit: 3,
  maxBoxesPerUnit: 9,
  unitsNeeded: 2,
  selectedOrientation: {
    label: 'W-L-H',
    lengthAxis: 'width',
    widthAxis: 'length',
    heightAxis: 'height',
    yawDegrees: 90,
    equivalentYawDegrees: [90, 270],
    dimension: {
      lengthMm: 600,
      widthMm: 500,
      heightMm: 400,
    },
  },
  utilization: {
    volumeRate: 0.72,
    weightRate: 0.55,
  },
  search: {
    evaluatedOrientationCount: 2,
    evaluatedScanStrategyCount: 6,
    selectedScanStrategy: 'layer-column-row',
    candidateSummaries: [],
  },
  placements: [],
  warnings: [],
  validation: {
    status: 'valid',
    messages: [],
  },
}

describe('vehicle loading layout snapshot json', () => {
  it('serializes and parses a layout snapshot', () => {
    const output = serializeVehicleLoadingLayoutSnapshot(snapshot)

    expect(parseVehicleLoadingLayoutSnapshotJson(output)).toMatchObject({
      schemaVersion: 'vehicle-loading-layout-snapshot.v1',
      id: 'snapshot-a',
      loadingSpaceId: 'container-a',
    })
  })

  it('rejects invalid json', () => {
    expect(() => parseVehicleLoadingLayoutSnapshotJson('{')).toThrow(
      VehicleLoadingLayoutSnapshotJsonError
    )
  })

  it('rejects snapshot schema mismatch', () => {
    expect(() =>
      parseVehicleLoadingLayoutSnapshotJson(
        JSON.stringify({ ...snapshot, schemaVersion: 'other.v1' })
      )
    ).toThrow('装载快照协议错误')
  })
})

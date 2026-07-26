import { describe, expect, it } from 'vitest'
import type {
  LoadingSpacePlan,
  LoadingSpacePlanRequest,
  VehicleLoadingPlan,
  VehicleLoadingPlanRequest,
} from '../data/vehicle-loading-wasm-plan.types'
import {
  buildVehicleLoadingLayoutSnapshotFromLoadingSpacePlan,
  buildVehicleLoadingLayoutSnapshotFromVehiclePlan,
} from './vehicle-loading-layout-snapshot'

const packageInput = {
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
}

const selectedOrientation = {
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
} as const

const search = {
  evaluatedOrientationCount: 2,
  evaluatedScanStrategyCount: 6,
  selectedScanStrategy: 'layer-column-row',
  candidateSummaries: [],
}

describe('vehicle loading layout snapshot builders', () => {
  it('builds a snapshot from a vehicle plan and request', () => {
    const request: VehicleLoadingPlanRequest = {
      schemaVersion: 'vehicle-loading-request.v1',
      vehicle: {
        id: 'van-a',
        usableSpace: {
          lengthMm: 1200,
          widthMm: 1000,
          heightMm: 800,
        },
        blockedSpaces: [
          {
            id: 'wheel-well',
            kind: 'wheelWell',
            originMm: { xMm: 0, yMm: 0, zMm: 0 },
            dimension: { lengthMm: 200, widthMm: 200, heightMm: 150 },
          },
        ],
        payloadKg: 1000,
      },
      package: packageInput,
    }
    const plan: VehicleLoadingPlan = {
      schemaVersion: 'vehicle-loading-plan.v1',
      engineVersion: 'vehicle-loading-core-test',
      vehicleId: 'van-a',
      packageId: 'box-a',
      requestedBoxes: 12,
      boxesPlacedInPreviewVehicle: 8,
      remainingBoxesAfterPreviewVehicle: 4,
      maxBoxesPerVehicle: 8,
      vehiclesNeeded: 2,
      selectedOrientation,
      grid: {
        boxesAlongLength: 2,
        boxesAlongWidth: 2,
        layerCount: 2,
        boxesPerLayer: 4,
        availablePositions: 8,
        blockedPositions: 1,
      },
      utilization: { volumeRate: 0.64, weightRate: 0.5 },
      search,
      placements: [],
      warnings: [],
    }

    const snapshot = buildVehicleLoadingLayoutSnapshotFromVehiclePlan({
      id: 'snapshot:van-a',
      label: '算法方案',
      source: 'algorithm',
      request,
      plan,
    })

    expect(snapshot).toMatchObject({
      schemaVersion: 'vehicle-loading-layout-snapshot.v1',
      loadingSpaceId: 'van-a',
      boxesPlacedInPreviewUnit: 8,
      maxBoxesPerUnit: 8,
      validation: { status: 'valid' },
    })
    expect(snapshot.blockedSpaces).toHaveLength(1)
  })

  it('builds a snapshot from a generic loading-space plan and request', () => {
    const request: LoadingSpacePlanRequest = {
      schemaVersion: 'loading-space-plan-request.v1',
      loadingSpace: {
        id: 'container-a',
        usableSpace: {
          lengthMm: 1200,
          widthMm: 1000,
          heightMm: 800,
        },
        payloadKg: 1000,
      },
      package: packageInput,
    }
    const plan: LoadingSpacePlan = {
      schemaVersion: 'loading-space-plan.v1',
      engineVersion: 'loading-space-core-test',
      loadingSpaceId: 'container-a',
      packageId: 'box-a',
      requestedBoxes: 12,
      boxesPlacedInPreviewUnit: 9,
      remainingBoxesAfterPreviewUnit: 3,
      maxBoxesPerUnit: 9,
      unitsNeeded: 2,
      selectedOrientation,
      grid: {
        boxesAlongLength: 2,
        boxesAlongWidth: 2,
        layerCount: 2,
        boxesPerLayer: 4,
        availablePositions: 9,
        blockedPositions: 0,
      },
      utilization: { volumeRate: 0.72, weightRate: 0.55 },
      search,
      placements: [],
      warnings: [],
    }

    const snapshot = buildVehicleLoadingLayoutSnapshotFromLoadingSpacePlan({
      id: 'snapshot:container-a',
      label: '货柜方案',
      source: 'algorithm',
      request,
      plan,
    })

    expect(snapshot).toMatchObject({
      schemaVersion: 'vehicle-loading-layout-snapshot.v1',
      loadingSpaceId: 'container-a',
      boxesPlacedInPreviewUnit: 9,
      maxBoxesPerUnit: 9,
      blockedSpaces: [],
    })
  })
})

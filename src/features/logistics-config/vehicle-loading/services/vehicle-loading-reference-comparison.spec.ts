import { describe, expect, it } from 'vitest'
import type { VehicleLoadingLayoutSnapshot } from '../data/vehicle-loading-layout-snapshot.types'
import type {
  LoadingSpacePlan,
  VehicleLoadingPlan,
} from '../data/vehicle-loading-wasm-plan.types'
import {
  buildVehicleLoadingReferenceComparisonFromLayoutSnapshot,
  buildVehicleLoadingReferenceComparisonFromLoadingSpacePlan,
  buildVehicleLoadingReferenceComparisonFromVehiclePlan,
} from './vehicle-loading-reference-comparison'

const basePlan = {
  engineVersion: 'test-engine',
  packageId: 'box-a',
  requestedBoxes: 12,
  selectedOrientation: {
    label: 'W-L-H',
    lengthAxis: 'width',
    widthAxis: 'length',
    heightAxis: 'height',
    yawDegrees: 90,
    equivalentYawDegrees: [90, 270],
    dimension: {
      lengthMm: 500,
      widthMm: 600,
      heightMm: 400,
    },
  },
  grid: {
    boxesAlongLength: 2,
    boxesAlongWidth: 2,
    layerCount: 2,
    boxesPerLayer: 4,
    availablePositions: 8,
    blockedPositions: 1,
  },
  utilization: {
    volumeRate: 0.62,
    weightRate: 0.48,
  },
  search: {
    evaluatedOrientationCount: 2,
    evaluatedScanStrategyCount: 6,
    selectedScanStrategy: 'layer-column-row',
    candidateSummaries: [],
  },
  placements: [],
  warnings: [],
} as const

describe('vehicle loading reference comparison builders', () => {
  it('builds a manual reference from a vehicle plan', () => {
    const plan: VehicleLoadingPlan = {
      ...basePlan,
      schemaVersion: 'vehicle-loading-plan.v1',
      vehicleId: 'van-a',
      boxesPlacedInPreviewVehicle: 8,
      remainingBoxesAfterPreviewVehicle: 4,
      maxBoxesPerVehicle: 8,
      vehiclesNeeded: 2,
    }

    expect(
      buildVehicleLoadingReferenceComparisonFromVehiclePlan({
        id: 'manual:van-a',
        kind: 'manual-reference',
        label: '人工方案',
        plan,
      })
    ).toMatchObject({
      id: 'manual:van-a',
      kind: 'manual-reference',
      label: '人工方案',
      yawDegrees: 90,
      maxBoxesPerUnit: 8,
      scanStrategy: 'layer-column-row',
      blockedPositions: 1,
    })
  })

  it('builds a CAD reference from a generic loading-space plan', () => {
    const plan: LoadingSpacePlan = {
      ...basePlan,
      schemaVersion: 'loading-space-plan.v1',
      loadingSpaceId: 'container-a',
      boxesPlacedInPreviewUnit: 9,
      remainingBoxesAfterPreviewUnit: 3,
      maxBoxesPerUnit: 9,
      unitsNeeded: 2,
    }

    expect(
      buildVehicleLoadingReferenceComparisonFromLoadingSpacePlan({
        id: 'cad:container-a',
        kind: 'cad-reference',
        label: 'UG/NX 参考',
        plan,
      })
    ).toMatchObject({
      id: 'cad:container-a',
      kind: 'cad-reference',
      label: 'UG/NX 参考',
      yawDegrees: 90,
      maxBoxesPerUnit: 9,
      volumeRate: 0.62,
      weightRate: 0.48,
    })
  })

  it('builds a reference from a layout snapshot', () => {
    const snapshot: VehicleLoadingLayoutSnapshot = {
      schemaVersion: 'vehicle-loading-layout-snapshot.v1',
      id: 'snapshot:cad-a',
      label: 'UG/NX 参考',
      source: 'cad-reference',
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
      boxesPlacedInPreviewUnit: 10,
      remainingBoxesAfterPreviewUnit: 2,
      maxBoxesPerUnit: 10,
      unitsNeeded: 2,
      selectedOrientation: basePlan.selectedOrientation,
      utilization: {
        volumeRate: 0.7,
        weightRate: 0.58,
      },
      search: {
        ...basePlan.search,
        candidateSummaries: [
          {
            orientationLabel: 'W-L-H',
            yawDegrees: 90,
            scanStrategy: 'layer-column-row',
            maxBoxesPerUnit: 10,
            volumeRate: 0.7,
            weightRate: 0.58,
            blockedPositions: 1,
          },
        ],
      },
      placements: [],
      warnings: [],
      validation: {
        status: 'valid',
        messages: [],
      },
    }

    expect(
      buildVehicleLoadingReferenceComparisonFromLayoutSnapshot(snapshot)
    ).toMatchObject({
      id: 'snapshot:cad-a',
      kind: 'cad-reference',
      maxBoxesPerUnit: 10,
      volumeRate: 0.7,
      blockedPositions: 1,
    })
  })
})

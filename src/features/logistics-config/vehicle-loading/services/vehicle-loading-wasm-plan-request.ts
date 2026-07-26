import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'
import {
  VEHICLE_LOADING_REQUEST_SCHEMA_VERSION,
  type VehicleLoadingPlanBlockedSpaceInput,
  type VehicleLoadingPlanDimensionsMm,
  type VehicleLoadingPlanRequest,
} from '../data/vehicle-loading-wasm-plan.types'
import type { VehicleLoadingPackageInput } from '../data/vehicle-loading.types'

type BuildVehicleLoadingPlanRequestFromMasterDataOptions = {
  boxes: number
  vehicleSpec: VehicleSpec
  packageInput: VehicleLoadingPackageInput
  usableSpace?: VehicleLoadingPlanDimensionsMm
  blockedSpaces?: VehicleLoadingPlanBlockedSpaceInput[]
  maxPlacementOutput?: number
  maxGridCellScan?: number
}

function requirePositiveFiniteNumber(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} 必须是大于 0 的数字。`)
  }
}

function requirePositiveInteger(value: number, fieldName: string) {
  requirePositiveFiniteNumber(value, fieldName)
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} 必须是整数。`)
  }
}

function buildVehicleLoadingPlanRequestLimits({
  maxPlacementOutput,
  maxGridCellScan,
}: Pick<
  BuildVehicleLoadingPlanRequestFromMasterDataOptions,
  'maxPlacementOutput' | 'maxGridCellScan'
>): VehicleLoadingPlanRequest['limits'] {
  if (maxPlacementOutput === undefined && maxGridCellScan === undefined) {
    return undefined
  }
  if (maxPlacementOutput !== undefined) {
    requirePositiveInteger(maxPlacementOutput, '摆放输出上限')
  }
  if (maxGridCellScan !== undefined) {
    requirePositiveInteger(maxGridCellScan, '障碍格位扫描上限')
  }
  return {
    maxPlacementOutput,
    maxGridCellScan,
  }
}

export function buildVehicleLoadingPlanRequestFromMasterData({
  boxes,
  vehicleSpec,
  packageInput,
  usableSpace,
  blockedSpaces,
  maxPlacementOutput,
  maxGridCellScan,
}: BuildVehicleLoadingPlanRequestFromMasterDataOptions): VehicleLoadingPlanRequest {
  requirePositiveInteger(boxes, '箱数')
  requirePositiveFiniteNumber(vehicleSpec.payloadKg, '车型载重')
  requirePositiveFiniteNumber(packageInput.unitWeightKg, '单箱重量')

  return {
    schemaVersion: VEHICLE_LOADING_REQUEST_SCHEMA_VERSION,
    vehicle: {
      id: vehicleSpec.id,
      name: vehicleSpec.name,
      usableSpace: usableSpace ?? vehicleSpec.usableInnerSize,
      blockedSpaces,
      payloadKg: vehicleSpec.payloadKg,
    },
    package: {
      id: packageInput.packageId,
      name: packageInput.name,
      quantity: boxes,
      unitWeightKg: packageInput.unitWeightKg,
      dimension: {
        lengthMm: packageInput.dimension.lengthMm,
        widthMm: packageInput.dimension.widthMm,
        heightMm: packageInput.dimension.heightMm,
      },
      canRotate: packageInput.dimension.canRotate,
      canInvert: packageInput.dimension.canInvert,
    },
    limits: buildVehicleLoadingPlanRequestLimits({
      maxPlacementOutput,
      maxGridCellScan,
    }),
  }
}

import type { PackagingProfile } from '@/features/logistics-config/packaging-rules-service'
import type { Unit } from '@/features/basic-settings/services/unit-service'
import type {
  PackageDimension,
  ShipmentSummary,
  VehicleLoadingApiPackageDraft,
  VehicleLoadingPackageInput,
} from '../data/vehicle-loading.types'

export const DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION: PackageDimension = {
  lengthMm: 660,
  widthMm: 660,
  heightMm: 800,
  canRotate: true,
  canInvert: false,
}

function normalizeUnitCode(code: string): string {
  return code.trim().toLowerCase()
}

function toMillimeters(value: number, unitCode: string, units: Unit[]): number {
  const normalized = normalizeUnitCode(unitCode)
  const unitInfo = units.find((u) => normalizeUnitCode(u.code) === normalized)
  if (!unitInfo) {
    throw new Error(`Dimension unit '${unitCode}' not found in active units authority`)
  }
  if (unitInfo.category !== 'LENGTH') {
    throw new Error(`Dimension unit '${unitCode}' must be of category LENGTH, got ${unitInfo.category}`)
  }
  switch (normalized) {
    case 'mm':
    case '毫米':
      return value
    case 'cm':
    case '厘米':
      return value * 10
    case 'm':
    case '米':
      return value * 1000
    default:
      throw new Error(`Unsupported length unit code: ${unitCode}`)
  }
}

function toKilograms(value: number, unitCode: string): number {
  const normalized = normalizeUnitCode(unitCode)
  switch (normalized) {
    case 'kg':
    case '千克':
      return value
    case 'g':
    case '克':
      return value / 1000
    default:
      throw new Error(`Unsupported weight unit code: ${unitCode}`)
  }
}

function validatePositiveNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0`)
  }
  return value
}

export function buildManualVehicleLoadingPackageInput(
  summary: ShipmentSummary,
  sourceLabel = '手动试算'
): VehicleLoadingPackageInput {
  return {
    packageId: 'manual-shipment',
    name: sourceLabel,
    unitWeightKg:
      summary.boxes > 0 ? validatePositiveNumber(summary.totalWeightKg / summary.boxes, 'Manual unit weight') : validatePositiveNumber(summary.totalWeightKg, 'Manual total weight'),
    dimension: DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION,
  }
}

export function createDefaultVehicleLoadingApiPackageDraft(
  summary: ShipmentSummary
): VehicleLoadingApiPackageDraft {
  return {
    name: 'API 输入箱型',
    unitWeightKg: String(summary.boxes > 0 ? Number((summary.totalWeightKg / summary.boxes).toFixed(3)) : summary.totalWeightKg),
    lengthMm: String(DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.lengthMm),
    widthMm: String(DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.widthMm),
    heightMm: String(DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.heightMm),
    canRotate: DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.canRotate,
    canInvert: DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.canInvert,
  }
}

export function buildVehicleLoadingPackageInputFromProfile(
  profile: PackagingProfile,
  sourceLabel = '包装规则结果'
): VehicleLoadingPackageInput {
  const unitWeightBase = profile.grossWeight > 0 ? profile.grossWeight : profile.netWeight

  return {
    packageId: profile.id,
    profileId: profile.id,
    name: profile.name || sourceLabel,
    unitWeightKg: validatePositiveNumber(toKilograms(unitWeightBase, profile.weightUnitCode), 'Packaging profile gross weight'),
    dimension: {
      lengthMm: validatePositiveNumber(toMillimeters(profile.length, profile.dimensionUnitCode), 'Packaging profile length'),
      widthMm: validatePositiveNumber(toMillimeters(profile.width, profile.dimensionUnitCode), 'Packaging profile width'),
      heightMm: validatePositiveNumber(toMillimeters(profile.height, profile.dimensionUnitCode), 'Packaging profile height'),
      canRotate: true,
      canInvert: false,
    },
  }
}

export function buildVehicleLoadingPackageInputFromApiDraft(
  draft: VehicleLoadingApiPackageDraft,
  sourceLabel = 'API 结果'
): VehicleLoadingPackageInput {
  return {
    packageId: 'api-package-input',
    name: draft.name.trim() || sourceLabel,
    unitWeightKg: validatePositiveNumber(Number(draft.unitWeightKg), 'API unit weight'),
    dimension: {
      lengthMm: validatePositiveNumber(Number(draft.lengthMm), 'API length'),
      widthMm: validatePositiveNumber(Number(draft.widthMm), 'API width'),
      heightMm: validatePositiveNumber(Number(draft.heightMm), 'API height'),
      canRotate: draft.canRotate,
      canInvert: draft.canInvert,
    },
  }
}

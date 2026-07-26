import type { PackagingProfile } from '@/features/logistics-packaging-management/packaging-rules-service'
import type {
  PackageDimension,
  ShipmentSummary,
  VehicleLoadingPackageDraft,
  VehicleLoadingPackageInput,
} from '../data/vehicle-loading.types'

export const DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION: PackageDimension = {
  lengthMm: 420,
  widthMm: 420,
  heightMm: 400,
  canRotate: true,
  canInvert: false,
}

function normalizeUnitCode(code: string): string {
  return code.trim().toLowerCase()
}

function toMillimeters(value: number, unitCode: string): number {
  const normalized = normalizeUnitCode(unitCode)
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
    case 't':
    case 'ton':
    case 'tonne':
    case '吨':
      return value * 1000
    default:
      throw new Error(`Unsupported weight unit code: ${unitCode}`)
  }
}

function validatePositiveNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label}必须大于 0`)
  }
  return value
}

function resolveUnitWeightFromSummary(
  summary: ShipmentSummary,
  label: string
): number {
  return summary.boxes > 0
    ? validatePositiveNumber(summary.totalWeightKg / summary.boxes, label)
    : validatePositiveNumber(summary.totalWeightKg, label)
}

export function buildManualVehicleLoadingPackageInput(
  summary: ShipmentSummary,
  sourceLabel = '装箱汇总输入'
): VehicleLoadingPackageInput {
  return {
    packageId: 'manual-shipment',
    name: sourceLabel,
    unitWeightKg: resolveUnitWeightFromSummary(summary, '单箱重量'),
    dimension: DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION,
  }
}

export function createDefaultVehicleLoadingPackageDraft(): VehicleLoadingPackageDraft {
  return {
    name: '装箱汇总箱型',
    lengthMm: String(DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.lengthMm),
    widthMm: String(DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.widthMm),
    heightMm: String(DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.heightMm),
    canRotate: DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.canRotate,
    canInvert: DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION.canInvert,
  }
}

export function buildVehicleLoadingPackageInputFromProfile(
  profile: PackagingProfile,
  sourceLabel = '包装规则箱型'
): VehicleLoadingPackageInput {
  const unitWeightBase =
    profile.grossWeight > 0 ? profile.grossWeight : profile.netWeight

  return {
    packageId: profile.id,
    profileId: profile.id,
    name: profile.name || sourceLabel,
    unitWeightKg: validatePositiveNumber(
      toKilograms(unitWeightBase, profile.weightUnitCode),
      '包装规则毛重'
    ),
    dimension: {
      lengthMm: validatePositiveNumber(
        toMillimeters(profile.length, profile.dimensionUnitCode),
        '包装规则长度'
      ),
      widthMm: validatePositiveNumber(
        toMillimeters(profile.width, profile.dimensionUnitCode),
        '包装规则宽度'
      ),
      heightMm: validatePositiveNumber(
        toMillimeters(profile.height, profile.dimensionUnitCode),
        '包装规则高度'
      ),
      canRotate: true,
      canInvert: false,
    },
  }
}

export function buildVehicleLoadingPackageInputFromDraft(
  draft: VehicleLoadingPackageDraft,
  summary: ShipmentSummary,
  sourceLabel = '装箱汇总输入'
): VehicleLoadingPackageInput {
  return {
    packageId: 'shipment-package-input',
    name: draft.name.trim() || sourceLabel,
    unitWeightKg: resolveUnitWeightFromSummary(summary, '单箱重量'),
    dimension: {
      lengthMm: validatePositiveNumber(Number(draft.lengthMm), '箱型长度'),
      widthMm: validatePositiveNumber(Number(draft.widthMm), '箱型宽度'),
      heightMm: validatePositiveNumber(Number(draft.heightMm), '箱型高度'),
      canRotate: draft.canRotate,
      canInvert: draft.canInvert,
    },
  }
}

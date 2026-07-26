import type { ShipmentSummary, VehicleLoadingPackageInput } from '../data/vehicle-loading.types'

function normalizeBoxes(boxes: number): number {
  if (!Number.isFinite(boxes) || boxes <= 0) {
    return 0
  }
  return Math.floor(boxes)
}

export function buildVehicleLoadingSummaryFromPackageInput(
  boxes: number,
  packageInput: VehicleLoadingPackageInput | null
): ShipmentSummary {
  const safeBoxes = normalizeBoxes(boxes)
  if (!packageInput || safeBoxes === 0) {
    return {
      boxes: safeBoxes,
      totalVolumeM3: 0,
      totalWeightKg: 0,
    }
  }

  const singleBoxVolumeM3 =
    (packageInput.dimension.lengthMm *
      packageInput.dimension.widthMm *
      packageInput.dimension.heightMm) /
    1_000_000_000

  return {
    boxes: safeBoxes,
    totalVolumeM3: safeBoxes * singleBoxVolumeM3,
    totalWeightKg: safeBoxes * packageInput.unitWeightKg,
  }
}

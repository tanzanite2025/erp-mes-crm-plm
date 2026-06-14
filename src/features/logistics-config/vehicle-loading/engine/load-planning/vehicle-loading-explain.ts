import type { VehicleLoadPlan } from './load-planning.types'

export function isBetterPlan(
  candidate: VehicleLoadPlan,
  current: VehicleLoadPlan
): boolean {
  if (candidate.maxBoxesPerVehicle !== current.maxBoxesPerVehicle) {
    return candidate.maxBoxesPerVehicle > current.maxBoxesPerVehicle
  }

  if (candidate.weightUtilization !== current.weightUtilization) {
    return candidate.weightUtilization > current.weightUtilization
  }

  if (candidate.volumeUtilization !== current.volumeUtilization) {
    return candidate.volumeUtilization > current.volumeUtilization
  }

  return false
}

export function comparePlans(a: VehicleLoadPlan, b: VehicleLoadPlan): number {
  if (a.maxBoxesPerVehicle !== b.maxBoxesPerVehicle)
    return b.maxBoxesPerVehicle - a.maxBoxesPerVehicle
  if (a.weightUtilization !== b.weightUtilization)
    return b.weightUtilization - a.weightUtilization
  if (a.volumeUtilization !== b.volumeUtilization)
    return b.volumeUtilization - a.volumeUtilization
  return 0
}

import type { Orientation, VehicleLoadPlan, VehicleLoadSpace } from './load-planning.types'

export function calculateLoadPlanForOrientation(
  vehicle: VehicleLoadSpace,
  orientation: Orientation,
  packageCount: number,
  unitWeightKg: number
): VehicleLoadPlan | null {
  const fits =
    orientation.lengthMm <= vehicle.usableInnerSize.lengthMm &&
    orientation.widthMm <= vehicle.usableInnerSize.widthMm &&
    orientation.heightMm <= vehicle.usableInnerSize.heightMm

  if (!fits) return null

  const boxesAlongLength = Math.floor(vehicle.usableInnerSize.lengthMm / orientation.lengthMm)
  const boxesAlongWidth = Math.floor(vehicle.usableInnerSize.widthMm / orientation.widthMm)
  const layers = Math.floor(vehicle.usableInnerSize.heightMm / orientation.heightMm)

  const boxesPerLayer = boxesAlongLength * boxesAlongWidth
  const maxBoxesByGeometry = boxesPerLayer * layers
  const maxBoxesByWeight = unitWeightKg > 0 ? Math.floor(vehicle.payloadKg / unitWeightKg) : 0
  const maxBoxesPerVehicle = Math.min(packageCount, maxBoxesByGeometry, maxBoxesByWeight)

  if (maxBoxesPerVehicle <= 0) return null

  const boxVolumeM3 = (orientation.lengthMm * orientation.widthMm * orientation.heightMm) / 1_000_000_000
  const loadedVolumeM3 = boxVolumeM3 * maxBoxesPerVehicle

  return {
    vehicle,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    feasible: true,
    selectedOrientation: orientation,
    boxesPerLayer,
    layerCount: layers,
    maxBoxesPerVehicle,
    volumeUtilization: vehicle.volumeM3 > 0 ? Math.min(loadedVolumeM3 / vehicle.volumeM3, 1) : 0,
    weightUtilization: vehicle.payloadKg > 0 ? Math.min((maxBoxesPerVehicle * unitWeightKg) / vehicle.payloadKg, 1) : 0,
    loadingReason: [
      `采用 ${orientation.label} 朝向`,
      `每层可放 ${boxesPerLayer} 箱`,
      `可叠 ${layers} 层`,
    ],
    riskNotes: [],
  }
}

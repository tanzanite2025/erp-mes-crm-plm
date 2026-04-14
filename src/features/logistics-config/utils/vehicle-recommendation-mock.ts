import type { VehicleSpec } from '../vehicle-loading/data/vehicle-loading.types'

export type ShipmentSummary = {
  boxes: number
  totalVolumeM3: number
  totalWeightKg: number
}

export type VehicleRecommendation = {
  vehicle: VehicleSpec
  vehiclesNeeded: number
  reason: string
}

function ceilDiv(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.ceil(numerator / denominator)
}

export function mockRecommendVehicles(
  summary: ShipmentSummary,
  vehicleSpecs: VehicleSpec[]
): VehicleRecommendation[] {
  const candidates = vehicleSpecs
    .map((vehicle) => {
      const needByVolume = ceilDiv(summary.totalVolumeM3, vehicle.volumeM3)
      const needByWeight = ceilDiv(summary.totalWeightKg, vehicle.payloadKg)
      const vehiclesNeeded = Math.max(needByVolume, needByWeight, 1)

      const volumeWaste = vehiclesNeeded * vehicle.volumeM3 - summary.totalVolumeM3
      const weightWaste = vehiclesNeeded * vehicle.payloadKg - summary.totalWeightKg

      return {
        vehicle,
        vehiclesNeeded,
        volumeWaste,
        weightWaste,
      }
    })
    .sort((a, b) => {
      if (a.vehiclesNeeded !== b.vehiclesNeeded) return a.vehiclesNeeded - b.vehiclesNeeded
      if (a.volumeWaste !== b.volumeWaste) return a.volumeWaste - b.volumeWaste
      return a.weightWaste - b.weightWaste
    })

  return candidates.slice(0, 3).map((item) => {
    const reason = `Mock: volume=${summary.totalVolumeM3.toFixed(2)}m³, weight=${summary.totalWeightKg.toFixed(0)}kg -> ${item.vehiclesNeeded} x ${item.vehicle.name}`
    return {
      vehicle: item.vehicle,
      vehiclesNeeded: item.vehiclesNeeded,
      reason,
    }
  })
}

import type { VehicleRecommendationPlan } from '../engine/load-planning/load-planning.types'
import type { VehicleRecommendationResponseDTO, VehicleSpecDTO } from './vehicle-loading.schema'

function resolveOrientationAxis(label?: string): 'length' | 'width' | 'height' | undefined {
  if (!label) return undefined
  if (label.startsWith('L-')) return 'length'
  if (label.startsWith('W-')) return 'width'
  if (label.startsWith('H-')) return 'height'
  return undefined
}

export function mapLoadPlanToRecommendationResponse(
  plan: VehicleRecommendationPlan,
  totalBoxes: number
): VehicleRecommendationResponseDTO {
  return {
    recommendations: plan.plans.map((item) => ({
      vehicle: item.vehicle as VehicleSpecDTO,
      vehiclesNeeded: item.maxBoxesPerVehicle > 0 ? Math.ceil(totalBoxes / item.maxBoxesPerVehicle) : 0,
      loadRateVolume: item.volumeUtilization,
      loadRateWeight: item.weightUtilization,
      reason: item.loadingReason.join('；'),
      warning: item.riskNotes[0],
      selectedOrientationLabel: item.selectedOrientation?.label,
      selectedOrientationAxis: resolveOrientationAxis(item.selectedOrientation?.label),
      boxesPerLayer: item.boxesPerLayer,
      layerCount: item.layerCount,
      maxBoxesPerVehicle: item.maxBoxesPerVehicle,
    })),
    generatedAt: plan.generatedAt,
    engineVersion: plan.engineVersion,
  }
}

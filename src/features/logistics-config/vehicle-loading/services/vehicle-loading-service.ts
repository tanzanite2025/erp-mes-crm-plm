import { apiFetch } from '@/lib/api'
import { ensureObjectResponse } from '@/lib/api-response'
import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'
import {
  vehicleSpecSchema,
  type VehicleSpecDTO,
} from '../../vehicle-specs/services/vehicle-specs.schema'
import type {
  ShipmentSummary,
  VehicleLoadingPackageInput,
} from '../data/vehicle-loading.types'
import {
  shipmentSummarySchema,
  vehicleRecommendationRequestSchema,
  vehicleRecommendationResponseSchema,
  type ShipmentSummaryDTO,
  type VehicleRecommendationRequestDTO,
  type VehicleRecommendationResponseDTO,
} from './vehicle-loading.schema'

const VEHICLE_RECOMMENDATIONS_ENDPOINT =
  '/api/v1/logistics/vehicle-loading/recommendations'

function parseVehicleSpecs(vehicleSpecs: VehicleSpec[]): VehicleSpecDTO[] {
  return vehicleSpecs.map((spec) => vehicleSpecSchema.parse(spec))
}

function resolveVehicleSpecs(vehicleSpecs?: VehicleSpec[]): VehicleSpecDTO[] {
  if (!vehicleSpecs || vehicleSpecs.length === 0) {
    throw new Error('Vehicle specs are required for recommendations')
  }
  return parseVehicleSpecs(vehicleSpecs)
}

function resolveSummary(summary: ShipmentSummary): ShipmentSummaryDTO {
  return shipmentSummarySchema.parse(summary)
}

function buildRecommendationRequest(
  summary: ShipmentSummary,
  vehicleSpecs?: VehicleSpec[],
  packageInput?: VehicleLoadingPackageInput
): VehicleRecommendationRequestDTO {
  return vehicleRecommendationRequestSchema.parse({
    summary: resolveSummary(summary),
    vehicleSpecs: resolveVehicleSpecs(vehicleSpecs),
    packageInput,
  })
}

export async function getVehicleRecommendations(
  summary: ShipmentSummary,
  vehicleSpecs?: VehicleSpec[],
  packageInput?: VehicleLoadingPackageInput
): Promise<VehicleRecommendationResponseDTO> {
  const request = buildRecommendationRequest(
    summary,
    vehicleSpecs,
    packageInput
  )
  const response = await apiFetch<unknown>(VEHICLE_RECOMMENDATIONS_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return vehicleRecommendationResponseSchema.parse(
    ensureObjectResponse<Record<string, unknown>>(
      response,
      'vehicleLoadingService.getVehicleRecommendations'
    )
  )
}

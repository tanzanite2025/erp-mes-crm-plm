import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { ensureObjectResponse } from '@/lib/api-response'
import type {
  ShipmentSummary,
  VehicleLoadingPackageInput,
  VehicleSpec,
} from '../data/vehicle-loading.types'
import {
  shipmentSummarySchema,
  vehicleRecommendationRequestSchema,
  vehicleRecommendationResponseSchema,
  vehicleSpecSchema,
  type ShipmentSummaryDTO,
  type VehicleRecommendationRequestDTO,
  type VehicleRecommendationResponseDTO,
  type VehicleSpecDTO,
} from './vehicle-loading.schema'

const VEHICLE_SPECS_ENDPOINT = '/api/v1/logistics-config/vehicle-specs'
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

export async function getVehicleSpecs(): Promise<VehicleSpecDTO[]> {
  const response = await apiFetch<unknown>(VEHICLE_SPECS_ENDPOINT)
  return z.array(vehicleSpecSchema).parse(response)
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

import { MOCK_VEHICLE_SPECS } from '../data/vehicle-specs.mock'
import type { ShipmentSummary, VehicleSpec } from '../data/vehicle-loading.types'
import { buildVehicleLoadingPlan } from '../engine/load-planning/vehicle-loading-engine'
import { mapLoadPlanToRecommendationResponse } from './vehicle-loading-result-mapper'
import { apiFetch } from '@/lib/api'
import { createDefaultPackageProfileAdapter, type PackageProfileAdapter, type PackageProfileAdapterContext } from './vehicle-loading-package-adapters'
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

const USE_MOCK_API = true
const VEHICLE_SPECS_ENDPOINT = '/api/logistics/vehicle-loading/specs'
const VEHICLE_RECOMMENDATIONS_ENDPOINT = '/api/logistics/vehicle-loading/recommendations'

function parseVehicleSpecs(vehicleSpecs: VehicleSpec[]): VehicleSpecDTO[] {
  return vehicleSpecs.map((spec) => vehicleSpecSchema.parse(spec))
}

function resolveVehicleSpecs(vehicleSpecs?: VehicleSpec[]): VehicleSpecDTO[] {
  return parseVehicleSpecs(vehicleSpecs ?? MOCK_VEHICLE_SPECS)
}

function resolveSummary(summary: ShipmentSummary): ShipmentSummaryDTO {
  return shipmentSummarySchema.parse(summary)
}

function resolveSpecsFromSource(): VehicleSpecDTO[] {
  if (!USE_MOCK_API) {
    return []
  }

  return resolveVehicleSpecs()
}

function buildRecommendationRequest(summary: ShipmentSummary, vehicleSpecs?: VehicleSpec[]): VehicleRecommendationRequestDTO {
  return vehicleRecommendationRequestSchema.parse({
    summary: resolveSummary(summary),
    vehicleSpecs: resolveVehicleSpecs(vehicleSpecs),
  })
}

function buildRecommendationFromEngine(
  request: VehicleRecommendationRequestDTO,
  packageProfileAdapter: PackageProfileAdapter,
  packageProfileContext?: PackageProfileAdapterContext
): VehicleRecommendationResponseDTO {
  const plan = buildVehicleLoadingPlan({
    packageProfile: packageProfileAdapter(request.summary, packageProfileContext),
    vehicles: request.vehicleSpecs,
  })

  return vehicleRecommendationResponseSchema.parse(mapLoadPlanToRecommendationResponse(plan, request.summary.boxes))
}

export async function getVehicleSpecs(): Promise<VehicleSpecDTO[]> {
  if (USE_MOCK_API) {
    return resolveSpecsFromSource()
  }

  return apiFetch<VehicleSpecDTO[]>(VEHICLE_SPECS_ENDPOINT)
}

export async function getVehicleRecommendations(
  summary: ShipmentSummary,
  vehicleSpecs?: VehicleSpec[],
  packageProfileAdapter: PackageProfileAdapter = createDefaultPackageProfileAdapter(),
  packageProfileContext?: PackageProfileAdapterContext
): Promise<VehicleRecommendationResponseDTO> {
  const request = buildRecommendationRequest(summary, vehicleSpecs)

  if (!USE_MOCK_API) {
    return apiFetch<VehicleRecommendationResponseDTO>(VEHICLE_RECOMMENDATIONS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  return buildRecommendationFromEngine(request, packageProfileAdapter, packageProfileContext)
}

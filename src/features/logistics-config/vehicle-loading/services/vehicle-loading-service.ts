import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'
import type {
  ShipmentSummary,
  VehicleLoadingPackageInput,
} from '../data/vehicle-loading.types'
import {
  vehicleRecommendationRequestSchema,
  vehicleRecommendationResponseSchema,
  type VehicleRecommendationRequestDTO,
  type VehicleRecommendationResponseDTO,
} from './vehicle-loading.schema'

const VEHICLE_RECOMMENDATIONS_ENDPOINT =
  '/logistics/vehicle-loading/recommendations'

function buildRecommendationRequest(
  summary: ShipmentSummary,
  vehicleSpecs?: VehicleSpec[],
  packageInput?: VehicleLoadingPackageInput
): VehicleRecommendationRequestDTO {
  const packagingProfileId = packageInput?.profileId?.trim()
  if (!packagingProfileId) {
    throw new Error(
      '当前包装规则缺少主数据 ID，无法提交服务端配车计算。'
    )
  }
  if (!vehicleSpecs || vehicleSpecs.length === 0) {
    throw new Error('车型规格不能为空。')
  }

  return vehicleRecommendationRequestSchema.parse({
    boxes: summary.boxes,
    packagingProfileId,
    vehicleSpecIds: vehicleSpecs.map((spec) => spec.id),
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

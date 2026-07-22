import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import type {
  VehiclePhotoAnnotation,
  VehiclePhotoViewType,
} from '../data/vehicle-photo-manifest'
import {
  vehiclePhotoEntrySchema,
  type VehiclePhotoEntryDTO,
} from './vehicle-specs.schema'

export type SaveVehiclePhotoInput = {
  url: string
  viewType: VehiclePhotoViewType
  alt?: string
  caption?: string
  sortOrder?: number
  annotations?: VehiclePhotoAnnotation[]
}

export async function saveVehiclePhoto(
  vehicleId: string,
  payload: SaveVehiclePhotoInput
): Promise<VehiclePhotoEntryDTO> {
  const res = await apiFetch<unknown>(
    `/logistics-config/vehicle-specs/${encodeURIComponent(vehicleId)}/photos`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )

  return vehiclePhotoEntrySchema.parse(
    ensureObjectResponse<Record<string, unknown>>(
      res,
      'VehiclePhotoService.saveVehiclePhoto'
    )
  )
}

import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { vehicleSpecSchema, type VehicleSpecDTO } from './vehicle-specs.schema'

const VEHICLE_SPECS_ENDPOINT = '/api/v1/logistics-config/vehicle-specs'

export async function getVehicleSpecs(): Promise<VehicleSpecDTO[]> {
  const response = await apiFetch<unknown>(VEHICLE_SPECS_ENDPOINT)
  return z.array(vehicleSpecSchema).parse(response)
}

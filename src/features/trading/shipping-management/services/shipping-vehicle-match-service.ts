import { apiFetch } from '@/lib/api-client'
import { parseShippingVehicleMatchItemsResponse } from '../schema'
import type { ShippingVehicleMatchItem } from '../types'

const SHIPPING_VEHICLE_MATCH_ITEMS_ENDPOINT = '/shipping-management/vehicle-match-items'

export async function getShippingVehicleMatchItems(): Promise<ShippingVehicleMatchItem[]> {
  const response = await apiFetch<unknown>(SHIPPING_VEHICLE_MATCH_ITEMS_ENDPOINT)
  return parseShippingVehicleMatchItemsResponse(response)
}

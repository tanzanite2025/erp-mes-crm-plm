import { type VehicleCategory } from './vehicle-contact.types'

export type VehicleContactFilterCategory = VehicleCategory | 'all'

export type VehicleContactFilterEnabled = 'all' | 'enabled' | 'disabled'

type VehicleContactFilterFields = {
  category: VehicleContactFilterCategory
  vehicleId: string | 'all'
  enabled: VehicleContactFilterEnabled
  keyword: string
}

export type VehicleContactRemoteFilters = VehicleContactFilterFields

export type VehicleContactUiFilters = VehicleContactFilterFields

export function createDefaultVehicleContactRemoteFilters(): VehicleContactRemoteFilters {
  return {
    category: 'all',
    vehicleId: 'all',
    enabled: 'all',
    keyword: '',
  }
}

export function createDefaultVehicleContactUiFilters(): VehicleContactUiFilters {
  return {
    category: 'all',
    vehicleId: 'all',
    enabled: 'all',
    keyword: '',
  }
}

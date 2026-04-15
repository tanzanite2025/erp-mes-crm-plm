import type { QueryKey } from '@tanstack/react-query'
import { type VehicleContactRemoteFilters } from './contact-filters.shared'

export const vehicleContactQueryKeys = {
  all: (): QueryKey => ['vehicle-contact-bindings'],
  list: (filters: VehicleContactRemoteFilters): QueryKey => ['vehicle-contact-bindings', 'list', filters],
} as const

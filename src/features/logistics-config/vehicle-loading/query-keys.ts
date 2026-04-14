import type { QueryKey } from '@tanstack/react-query'

export const vehicleLoadingQueryKeys = {
  all: (): QueryKey => ['vehicle-loading'],
  specs: (): QueryKey => ['vehicle-loading', 'specs'],
  recommendations: (): QueryKey => ['vehicle-loading', 'recommendations'],
} as const

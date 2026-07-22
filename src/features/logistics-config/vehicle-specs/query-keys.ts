import type { QueryKey } from '@tanstack/react-query'

export const vehicleSpecsQueryKeys = {
  all: (): QueryKey => ['vehicle-specs'],
  list: (): QueryKey => ['vehicle-specs', 'list'],
} as const

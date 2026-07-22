import type { QueryKey } from '@tanstack/react-query'

export const vehicleLoadingQueryKeys = {
  all: (): QueryKey => ['vehicle-loading'],
  recommendations: (): QueryKey => ['vehicle-loading', 'recommendations'],
  recommendationDetail: (
    summary: unknown,
    packageInput: unknown,
    vehicleSpecs: unknown,
    reloadToken: number
  ): QueryKey => [
    ...vehicleLoadingQueryKeys.recommendations(),
    summary,
    packageInput,
    vehicleSpecs,
    reloadToken,
  ],
} as const

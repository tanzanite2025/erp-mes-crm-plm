import type { QueryKey } from '@tanstack/react-query'

export const vehicleLoadingQueryKeys = {
  all: (): QueryKey => ['vehicle-loading'],
  recommendations: (): QueryKey => ['vehicle-loading', 'recommendations'],
  recommendationDetail: (
    summary: { boxes: number },
    packageInput: { profileId?: string } | null,
    vehicleSpecs: Array<{ id: string }>,
    reloadToken: number
  ): QueryKey => [
    ...vehicleLoadingQueryKeys.recommendations(),
    summary.boxes,
    packageInput?.profileId ?? null,
    vehicleSpecs.map((spec) => spec.id),
    reloadToken,
  ],
} as const

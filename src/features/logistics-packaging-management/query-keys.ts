import type { QueryKey } from '@tanstack/react-query'

export const packagingManagementQueryKeys = {
  all: (): QueryKey => ['logistics-packaging-management'],
  profiles: (): QueryKey => [
    'logistics-packaging-management',
    'packaging-profiles',
  ],
} as const

import type { QueryKey } from '@tanstack/react-query'

export const productionResourceQueryKeys = {
  all: (): QueryKey => ['production-shared'],
  lines: (): QueryKey => ['production-shared', 'lines'],
  processes: (): QueryKey => ['production-shared', 'processes'],
  mappings: (): QueryKey => ['production-shared', 'mappings'],
} as const

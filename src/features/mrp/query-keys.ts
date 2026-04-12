import type { QueryKey } from '@tanstack/react-query'

export const mrpQueryKeys = {
  all: (): QueryKey => ['mrp'],
  requirementsCalculation: (): QueryKey => ['mrp', 'requirements-calculation'],
} as const

import type { QueryKey } from '@tanstack/react-query'

export const productionResourceQueryKeys = {
  all: (): QueryKey => ['production-shared'],
  lines: (): QueryKey => ['production-shared', 'lines'],
  processes: (): QueryKey => ['production-shared', 'processes'],
  routes: (): QueryKey => ['production-shared', 'routes'],
  routeBOMBranches: (): QueryKey => [
    'production-shared',
    'routes',
    'bom-branches',
  ],
  routeSalesOrderLineCandidates: (productId: string): QueryKey => [
    'production-shared',
    'routes',
    'sales-order-line-candidates',
    productId,
  ],
} as const

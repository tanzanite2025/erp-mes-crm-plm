import type { QueryKey } from '@tanstack/react-query'

export const productionResourceQueryKeys = {
  all: (): QueryKey => ['production-shared'],
  lines: (): QueryKey => ['production-shared', 'lines'],
  lineProductTemplates: (): QueryKey => [
    'production-shared',
    'line-product-templates',
  ],
  lineBOMBranches: (): QueryKey => [
    'production-shared',
    'lines',
    'bom-branches',
  ],
  processes: (): QueryKey => ['production-shared', 'processes'],
  routes: (): QueryKey => ['production-shared', 'routes'],
  routeBOMBranches: (): QueryKey => [
    'production-shared',
    'routes',
    'bom-branches',
  ],
} as const

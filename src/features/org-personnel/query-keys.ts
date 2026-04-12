import type { QueryKey } from '@tanstack/react-query'

export const personnelQueryKeys = {
  all: (): QueryKey => ['personnel'],
  orgTree: (): QueryKey => ['personnel', 'org-tree'],
  employees: (): QueryKey => ['personnel', 'employees'],
  positions: (): QueryKey => ['personnel', 'positions'],
  leaves: {
    all: (): QueryKey => ['personnel', 'leaves'],
    my: (): QueryKey => ['personnel', 'leaves', 'my'],
    statsMy: (): QueryKey => ['personnel', 'leaves', 'stats', 'my'],
  },
  stats: {
    all: (): QueryKey => ['personnel', 'stats'],
    ranking: (): QueryKey => ['personnel', 'stats', 'ranking'],
  },
} as const

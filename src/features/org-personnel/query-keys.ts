import type { QueryKey } from '@tanstack/react-query'

export const personnelQueryKeys = {
  all: (): QueryKey => ['personnel'],
  orgTree: (): QueryKey => ['personnel', 'org-tree'],
  employees: (): QueryKey => ['personnel', 'employees'],
  positions: (): QueryKey => ['personnel', 'positions'],
  leaves: {
    all: (): QueryKey => ['personnel', 'leaves'],
    list: (): QueryKey => ['personnel', 'leaves', 'list'],
    stats: (): QueryKey => ['personnel', 'leaves', 'stats'],
  },
  stats: {
    all: (): QueryKey => ['personnel', 'stats'],
    ranking: (): QueryKey => ['personnel', 'stats', 'ranking'],
  },
} as const

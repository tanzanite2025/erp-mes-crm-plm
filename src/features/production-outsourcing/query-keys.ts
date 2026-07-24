import type { OutsourcePartnerStatus } from './data/outsource-partner'

export interface OutsourcePartnerFilters {
  search?: string
  status?: OutsourcePartnerStatus | 'ALL'
}

export const outsourcePartnerQueryKeys = {
  all: ['production-outsourcing', 'partners'] as const,
  list: (filters: OutsourcePartnerFilters = {}) =>
    [
      ...outsourcePartnerQueryKeys.all,
      {
        search: filters.search?.trim() ?? '',
        status: filters.status ?? 'ALL',
      },
    ] as const,
}

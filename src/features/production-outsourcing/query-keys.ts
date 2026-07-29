import type {
  OutsourceOrderSourceType,
  OutsourceOrderStatus,
} from './data/outsource-order'
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

export interface OutsourceOrderFilters {
  search?: string
  status?: OutsourceOrderStatus | 'ALL'
  sourceType?: OutsourceOrderSourceType | 'ALL'
  partnerId?: string
}

export const outsourceOrderQueryKeys = {
  all: ['production-outsourcing', 'orders'] as const,
  list: (filters: OutsourceOrderFilters = {}) =>
    [
      ...outsourceOrderQueryKeys.all,
      {
        search: filters.search?.trim() ?? '',
        status: filters.status ?? 'ALL',
        sourceType: filters.sourceType ?? 'ALL',
        partnerId: filters.partnerId?.trim() ?? '',
      },
    ] as const,
}

export const outsourceDiagnosticsQueryKeys = {
  all: ['production-outsourcing', 'diagnostics'] as const,
  status: () => [...outsourceDiagnosticsQueryKeys.all, 'status'] as const,
}

export const outsourceInventoryCategoryQueryKeys = {
  all: ['production-outsourcing', 'inventory-categories'] as const,
  options: () =>
    [...outsourceInventoryCategoryQueryKeys.all, 'options'] as const,
}

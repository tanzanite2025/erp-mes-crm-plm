import { type QueryClient, useQuery } from '@tanstack/react-query'
import {
  normalizeProductBindingHistoryQuery,
  productBindingService,
  type ProductBindingHistoryQuery,
} from '../services/product-binding-service'

export const productBindingHistoryQueryRootKey = [
  'cutting-operations',
  'product-binding',
  'history',
] as const

export const productBindingHistoryCountQueryBaseKey = [
  ...productBindingHistoryQueryRootKey,
  'count',
] as const

export const productBindingHistoryQueryBaseKey = [
  ...productBindingHistoryQueryRootKey,
  'list',
] as const

const PRODUCT_BINDING_HISTORY_LIST_STALE_TIME = 15 * 1000
const PRODUCT_BINDING_HISTORY_COUNT_STALE_TIME = 30 * 1000
const PRODUCT_BINDING_HISTORY_GC_TIME = 5 * 60 * 1000

export function buildProductBindingHistoryQueryKey(
  filters: ProductBindingHistoryQuery = {}
) {
  const normalized = normalizeProductBindingHistoryQuery(filters)

  return [
    ...productBindingHistoryQueryBaseKey,
    normalized.limit ?? '',
    normalized.productBarcode ?? '',
    normalized.prepregBindingToken ?? '',
  ] as const
}

export function buildProductBindingHistoryCountQueryKey(
  filters: ProductBindingHistoryQuery = {}
) {
  const normalized = normalizeProductBindingHistoryQuery(filters)

  return [
    ...productBindingHistoryCountQueryBaseKey,
    normalized.productBarcode ?? '',
    normalized.prepregBindingToken ?? '',
  ] as const
}

type UseProductBindingHistoryQueryOptions = {
  enabled?: boolean
}

export async function invalidateProductBindingHistoryQueries(
  queryClient: QueryClient
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: productBindingHistoryQueryBaseKey,
    }),
    queryClient.invalidateQueries({
      queryKey: productBindingHistoryCountQueryBaseKey,
    }),
  ])
}

export function useProductBindingHistoryQuery(
  filters: ProductBindingHistoryQuery = {},
  options: UseProductBindingHistoryQueryOptions = {}
) {
  const normalizedFilters = normalizeProductBindingHistoryQuery(filters)

  return useQuery({
    queryKey: buildProductBindingHistoryQueryKey(normalizedFilters),
    queryFn: () => productBindingService.listBindings(normalizedFilters),
    enabled: options.enabled ?? true,
    staleTime: PRODUCT_BINDING_HISTORY_LIST_STALE_TIME,
    gcTime: PRODUCT_BINDING_HISTORY_GC_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useProductBindingHistoryCountQuery(
  filters: ProductBindingHistoryQuery = {},
  options: UseProductBindingHistoryQueryOptions = {}
) {
  const normalizedFilters = normalizeProductBindingHistoryQuery(filters)

  return useQuery({
    queryKey: buildProductBindingHistoryCountQueryKey(normalizedFilters),
    queryFn: () => productBindingService.countBindings(normalizedFilters),
    enabled: options.enabled ?? true,
    staleTime: PRODUCT_BINDING_HISTORY_COUNT_STALE_TIME,
    gcTime: PRODUCT_BINDING_HISTORY_GC_TIME,
    refetchOnWindowFocus: false,
  })
}

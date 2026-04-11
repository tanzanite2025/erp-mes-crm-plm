import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { ProductionLine } from '../data/production-line'
import type { ProductionProcessStep } from '../data/production-process'
import { productionResourceQueryOptions } from '../data/production-resource-query-options'

type ProductionLinesQueryOptions = Omit<UseQueryOptions<ProductionLine[], Error>, 'queryKey' | 'queryFn'>
type ProductionProcessesQueryOptions = Omit<UseQueryOptions<ProductionProcessStep[], Error>, 'queryKey' | 'queryFn'>
type ProductionMappingsQueryOptions = Omit<UseQueryOptions<Record<string, string[]>, Error>, 'queryKey' | 'queryFn'>

export function useProductionLinesQuery(options?: ProductionLinesQueryOptions) {
  return useQuery({
    ...productionResourceQueryOptions.lines(),
    ...options,
  })
}

export function useProductionProcessesQuery(options?: ProductionProcessesQueryOptions) {
  return useQuery({
    ...productionResourceQueryOptions.processes(),
    ...options,
  })
}

export function useProductionMappingsQuery(options?: ProductionMappingsQueryOptions) {
  return useQuery({
    ...productionResourceQueryOptions.mappings(),
    ...options,
  })
}

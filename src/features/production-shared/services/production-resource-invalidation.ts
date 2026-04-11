import type { QueryClient } from '@tanstack/react-query'
import { productionResourceQueryKeys } from '../data/production-resource-query-keys'

let productionResourceQueryClient: QueryClient | null = null

export function registerProductionResourceQueryClient(queryClient: QueryClient): void {
  productionResourceQueryClient = queryClient
}

async function invalidateQueryKey(queryClient: QueryClient | null, queryKey: readonly unknown[]): Promise<void> {
  if (!queryClient) {
    return
  }

  await queryClient.invalidateQueries({ queryKey: [...queryKey] })
}

export const productionResourceInvalidation = {
  invalidateAll: async (): Promise<void> => {
    await invalidateQueryKey(productionResourceQueryClient, productionResourceQueryKeys.all())
  },

  invalidateLines: async (): Promise<void> => {
    await Promise.all([
      invalidateQueryKey(productionResourceQueryClient, productionResourceQueryKeys.all()),
      invalidateQueryKey(productionResourceQueryClient, productionResourceQueryKeys.lines()),
    ])
  },

  invalidateProcesses: async (): Promise<void> => {
    await Promise.all([
      invalidateQueryKey(productionResourceQueryClient, productionResourceQueryKeys.all()),
      invalidateQueryKey(productionResourceQueryClient, productionResourceQueryKeys.processes()),
    ])
  },

  invalidateMappings: async (): Promise<void> => {
    await Promise.all([
      invalidateQueryKey(productionResourceQueryClient, productionResourceQueryKeys.all()),
      invalidateQueryKey(productionResourceQueryClient, productionResourceQueryKeys.mappings()),
    ])
  },
}

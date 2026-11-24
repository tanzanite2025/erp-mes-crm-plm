import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'

const productionWorkLocationCatalogResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      code: z.string(),
      name: z.string(),
      description: z.string(),
      isActive: z.boolean(),
      version: z.number(),
    })
  ),
})

export const productionWorkLocationCatalogQueryKey = [
  'production',
  'work-locations',
] as const

export async function queryProductionWorkLocationCatalog(signal?: AbortSignal) {
  const response = productionWorkLocationCatalogResponseSchema.parse(
    await apiFetch<unknown>('/production/work-locations', { signal })
  )
  return response.items.filter((location) => location.isActive)
}

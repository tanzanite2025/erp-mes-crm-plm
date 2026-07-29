import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { toOutsourceInventoryCategoryOptionContracts } from '../adapters/outsource-inventory-category-api-adapter'
import type { OutsourceInventoryCategoryOptionApiDTO } from '../contracts/outsource-inventory-category-api-dto'
import type { OutsourceInventoryCategoryOption } from '../data/outsource-inventory-category'

export async function getOutsourceInventoryCategoryOptions(): Promise<
  OutsourceInventoryCategoryOption[]
> {
  const context = 'OutsourceInventoryCategoryService.getOptions'
  const response = await apiFetch<OutsourceInventoryCategoryOptionApiDTO[]>(
    '/production/outsourcing/inventory-category-options'
  )
  return toOutsourceInventoryCategoryOptionContracts(
    ensureArrayResponse<OutsourceInventoryCategoryOptionApiDTO>(
      response,
      context
    )
  )
}

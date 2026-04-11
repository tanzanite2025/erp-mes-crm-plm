import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import type { ProductionMessageApiDTO } from '../contracts/production-resource-api-dto'

interface JobCategoryProcessMappingApiDTO {
  jobCategoryId: string
  processId: string
}

export const productionJobCategoryCapabilitiesService = {
  assignProcessCapability: async (jobCategoryId: string, processId: string): Promise<void> => {
    const payload: JobCategoryProcessMappingApiDTO = { jobCategoryId, processId }
    const res = await apiFetch<ProductionMessageApiDTO>('/production/mappings/assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionJobCategoryCapabilitiesService.assignProcessCapability'
    )
  },

  removeProcessCapability: async (jobCategoryId: string, processId: string): Promise<void> => {
    const payload: JobCategoryProcessMappingApiDTO = { jobCategoryId, processId }
    const res = await apiFetch<ProductionMessageApiDTO>('/production/mappings/remove', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionJobCategoryCapabilitiesService.removeProcessCapability'
    )
  },
}

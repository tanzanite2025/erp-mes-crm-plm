import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toProductionProcessContracts,
  toProductionProcessContract,
  toSaveProductionProcessStepApiDTO,
} from '../adapters/production-resource-api-adapter'
import type {
  ProductionMessageApiDTO,
  ProductionProcessStepApiDTO,
  ProductionProcessStepsResponseApiDTO,
} from '../contracts/production-resource-api-dto'
import type { ProductionProcessStep } from '../data/production-process'

export { PRODUCTION_PROCESSES_UPDATED_EVENT } from './production-resource-sync'

export const productionProcessesService = {
  getSteps: async (): Promise<ProductionProcessStep[]> => {
    const res = await apiFetch<ProductionProcessStepsResponseApiDTO>('/production/processes')
    const checked = ensureObjectResponse<ProductionProcessStepsResponseApiDTO & Record<string, unknown>>(
      res,
      'productionProcessesService.getSteps'
    )
    return toProductionProcessContracts(checked)
  },

  saveStep: async (step: ProductionProcessStep): Promise<ProductionProcessStep> => {
    const res = await apiFetch<ProductionProcessStepApiDTO>('/production/processes', {
      method: 'POST',
      body: JSON.stringify(toSaveProductionProcessStepApiDTO(step)),
    })

    const saved = toProductionProcessContract(
      ensureObjectResponse<ProductionProcessStepApiDTO & Record<string, unknown>>(
        res,
        'productionProcessesService.saveStep'
      ) as ProductionProcessStepApiDTO
    )

    return saved
  },

  deleteStep: async (id: string): Promise<void> => {
    const res = await apiFetch<ProductionMessageApiDTO>(`/production/processes/${id}`, {
      method: 'DELETE',
    })

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionProcessesService.deleteStep'
    )
  },
}

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toStationMappingsContract,
} from '../adapters/production-resource-api-adapter'
import type {
  ProductionMessageApiDTO,
  StationMappingsResponseApiDTO,
  StationProcessMappingApiDTO,
} from '../contracts/production-resource-api-dto'

export { PRODUCTION_MAPPINGS_UPDATED_EVENT } from './production-resource-sync'

export const productionMappingsService = {
  getProcessCapabilityMappings: async (): Promise<Record<string, string[]>> => {
    const res = await apiFetch<StationMappingsResponseApiDTO>('/production/mappings')
    const checked = ensureObjectResponse<StationMappingsResponseApiDTO & Record<string, unknown>>(
      res,
      'productionMappingsService.getProcessCapabilityMappings'
    )
    return toStationMappingsContract(checked)
  },

  assignProcessCapability: async (nodeId: string, processId: string): Promise<void> => {
    const payload: StationProcessMappingApiDTO = { stationId: nodeId, processId }
    const res = await apiFetch<ProductionMessageApiDTO>('/production/mappings/assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionMappingsService.assignProcessCapability'
    )
  },

  removeProcessCapability: async (nodeId: string, processId: string): Promise<void> => {
    const payload: StationProcessMappingApiDTO = { stationId: nodeId, processId }
    const res = await apiFetch<ProductionMessageApiDTO>('/production/mappings/remove', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionMappingsService.removeProcessCapability'
    )
  },
}

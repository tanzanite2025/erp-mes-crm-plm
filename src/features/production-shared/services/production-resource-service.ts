import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  toArchitectureProcessContract,
  toProductionLineContract,
  toProductionLineContracts,
  toSaveProductionLineApiDTO,
  toSaveProductionProcessStepApiDTO,
  toStationMappingsContract,
} from '../adapters/production-resource-api-adapter'
import type {
  ProductionLineApiDTO,
  ProductionLinesResponseApiDTO,
  ProductionMessageApiDTO,
  ProductionProcessStepApiDTO,
  ProductionProcessStepsResponseApiDTO,
  StationMappingsResponseApiDTO,
  StationProcessMappingApiDTO,
} from '../contracts/production-resource-api-dto'
import type { ProcessStep } from '../tabs/work-architecture/components/process-utils'
import type { ProductionLine } from '../tabs/line-mgmt/types'

export const PRODUCTION_LINES_UPDATED_EVENT = 'xdfc_production_lines_v2_updated'
export const PRODUCTION_PROCESSES_UPDATED_EVENT = 'xdfc_production_processes_updated'
export const PRODUCTION_MAPPINGS_UPDATED_EVENT = 'xdfc_production_mappings_updated'

type SaveLinePayload = ProductionLine & {
  authCode?: string
}

function dispatchProductionEvent(eventName: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(eventName))
}

function dispatchProductionLinesUpdated(): void {
  dispatchProductionEvent(PRODUCTION_LINES_UPDATED_EVENT)
}

function dispatchProductionProcessesUpdated(): void {
  dispatchProductionEvent(PRODUCTION_PROCESSES_UPDATED_EVENT)
}

function dispatchProductionMappingsUpdated(): void {
  dispatchProductionEvent(PRODUCTION_MAPPINGS_UPDATED_EVENT)
}

export const productionResourceService = {
  getLines: async (): Promise<ProductionLine[]> => {
    const res = await apiFetch<ProductionLinesResponseApiDTO>('/production/lines')
    const checked = ensureObjectResponse<ProductionLinesResponseApiDTO & Record<string, unknown>>(
      res,
      'productionResourceService.getLines'
    )
    return toProductionLineContracts(checked)
  },

  saveLine: async (line: ProductionLine, authCode?: string): Promise<ProductionLine> => {
    const payload: SaveLinePayload = authCode ? { ...line, authCode } : line
    const res = await apiFetch<ProductionLineApiDTO>('/production/lines', {
      method: 'POST',
      body: JSON.stringify(toSaveProductionLineApiDTO(payload, authCode)),
    })

    const saved = toProductionLineContract(
      ensureObjectResponse<ProductionLineApiDTO & Record<string, unknown>>(
        res,
        'productionResourceService.saveLine'
      ) as ProductionLineApiDTO
    )

    dispatchProductionLinesUpdated()
    return saved
  },

  patchLine: async (id: string, delta: DeltaSet, version: number, authCode?: string): Promise<ProductionLine> => {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: {
        id,
        version,
        authCode,
      },
    }

    const res = await apiFetch<ProductionLineApiDTO>(`/production/lines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    const saved = toProductionLineContract(
      ensureObjectResponse<ProductionLineApiDTO & Record<string, unknown>>(
        res,
        'productionResourceService.patchLine'
      ) as ProductionLineApiDTO
    )

    dispatchProductionLinesUpdated()
    return saved
  },

  deleteLine: async (id: string): Promise<void> => {
    const res = await apiFetch<ProductionMessageApiDTO>(`/production/lines/${id}`, {
      method: 'DELETE',
    })

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionResourceService.deleteLine'
    )

    dispatchProductionLinesUpdated()
  },

  getSteps: async (): Promise<ProcessStep[]> => {
    const res = await apiFetch<ProductionProcessStepsResponseApiDTO>('/production/processes')
    const checked = ensureObjectResponse<ProductionProcessStepsResponseApiDTO & Record<string, unknown>>(
      res,
      'productionResourceService.getSteps'
    )
    return (checked.items || []).map(toArchitectureProcessContract)
  },

  saveStep: async (step: ProcessStep, stationId?: string): Promise<ProcessStep> => {
    const res = await apiFetch<ProductionProcessStepApiDTO>('/production/processes', {
      method: 'POST',
      body: JSON.stringify(toSaveProductionProcessStepApiDTO(step, stationId)),
    })

    const saved = toArchitectureProcessContract(
      ensureObjectResponse<ProductionProcessStepApiDTO & Record<string, unknown>>(
        res,
        'productionResourceService.saveStep'
      ) as ProductionProcessStepApiDTO
    )

    dispatchProductionProcessesUpdated()
    return saved
  },

  deleteStep: async (id: string): Promise<void> => {
    const res = await apiFetch<ProductionMessageApiDTO>(`/production/processes/${id}`, {
      method: 'DELETE',
    })

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionResourceService.deleteStep'
    )

    dispatchProductionProcessesUpdated()
  },

  getProcessCapabilityMappings: async (): Promise<Record<string, string[]>> => {
    const res = await apiFetch<StationMappingsResponseApiDTO>('/production/mappings')
    const checked = ensureObjectResponse<StationMappingsResponseApiDTO & Record<string, unknown>>(
      res,
      'productionResourceService.getProcessCapabilityMappings'
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
      'productionResourceService.assignProcessCapability'
    )

    dispatchProductionMappingsUpdated()
  },

  removeProcessCapability: async (nodeId: string, processId: string): Promise<void> => {
    const payload: StationProcessMappingApiDTO = { stationId: nodeId, processId }
    const res = await apiFetch<ProductionMessageApiDTO>('/production/mappings/remove', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionResourceService.removeProcessCapability'
    )

    dispatchProductionMappingsUpdated()
  },
}

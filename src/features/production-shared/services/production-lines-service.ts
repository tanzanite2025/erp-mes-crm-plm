import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  toProductionLineContract,
  toProductionLineContracts,
  toProductionLineProductTemplateContracts,
  toProductionRouteBOMBranchContracts,
  toSaveProductionLineApiDTO,
} from '../adapters/production-resource-api-adapter'
import type {
  ProductionLineApiDTO,
  ProductionLineProductTemplatesResponseApiDTO,
  ProductionLinesResponseApiDTO,
  ProductionMessageApiDTO,
  ProductionRouteBOMBranchesResponseApiDTO,
} from '../contracts/production-resource-api-dto'
import type {
  ProductionLine,
  ProductionLineBOMBranch,
  ProductionLineProductTemplate,
} from '../data/production-line'
import { normalizeProductionLineEntity } from '../utils/production-code-normalization'

export { PRODUCTION_LINES_UPDATED_EVENT } from './production-resource-sync'

type SaveLinePayload = ProductionLine & {
  authCode?: string
}

export const productionLinesService = {
  getProductTemplates: async (): Promise<ProductionLineProductTemplate[]> => {
    const response =
      await apiFetch<ProductionLineProductTemplatesResponseApiDTO>(
        '/production/product-templates'
      )
    const checked = ensureObjectResponse<
      ProductionLineProductTemplatesResponseApiDTO & Record<string, unknown>
    >(response, 'productionLinesService.getProductTemplates')
    return toProductionLineProductTemplateContracts(checked.items || [])
  },

  getBOMBranches: async (): Promise<ProductionLineBOMBranch[]> => {
    const response = await apiFetch<ProductionRouteBOMBranchesResponseApiDTO>(
      '/production/lines/bom-branches'
    )
    const checked = ensureObjectResponse<
      ProductionRouteBOMBranchesResponseApiDTO & Record<string, unknown>
    >(response, 'productionLinesService.getBOMBranches')
    return toProductionRouteBOMBranchContracts(checked.items || [])
  },

  getLines: async (): Promise<ProductionLine[]> => {
    const res =
      await apiFetch<ProductionLinesResponseApiDTO>('/production/lines')
    const checked = ensureObjectResponse<
      ProductionLinesResponseApiDTO & Record<string, unknown>
    >(res, 'productionLinesService.getLines')
    return toProductionLineContracts(checked)
  },

  saveLine: async (
    line: ProductionLine,
    authCode?: string
  ): Promise<ProductionLine> => {
    const normalizedLine = normalizeProductionLineEntity(line)
    const payload: SaveLinePayload = authCode
      ? { ...normalizedLine, authCode }
      : normalizedLine
    const res = await apiFetch<ProductionLineApiDTO>('/production/lines', {
      method: 'POST',
      body: JSON.stringify(toSaveProductionLineApiDTO(payload, authCode)),
    })

    const saved = toProductionLineContract(
      ensureObjectResponse<ProductionLineApiDTO & Record<string, unknown>>(
        res,
        'productionLinesService.saveLine'
      ) as ProductionLineApiDTO
    )

    return saved
  },

  patchLine: async (
    id: string,
    delta: DeltaSet,
    version: number,
    authCode?: string
  ): Promise<ProductionLine> => {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: {
        id,
        version,
        authCode,
      },
    }

    const res = await apiFetch<ProductionLineApiDTO>(
      `/production/lines/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    )

    const saved = toProductionLineContract(
      ensureObjectResponse<ProductionLineApiDTO & Record<string, unknown>>(
        res,
        'productionLinesService.patchLine'
      ) as ProductionLineApiDTO
    )

    return saved
  },

  deleteLine: async (id: string): Promise<void> => {
    const res = await apiFetch<ProductionMessageApiDTO>(
      `/production/lines/${id}`,
      {
        method: 'DELETE',
      }
    )

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionLinesService.deleteLine'
    )
  },
}

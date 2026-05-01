import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayField,
  ensureObjectResponse,
} from '@/lib/api-response'
import {
  toInboundRecordContracts,
  toInventoryAlertSummaryContract,
  toInventoryRecordContract,
  toInventoryValuationContract,
  toInventoryViewContracts,
} from '../adapters/inventory-api-adapter'
import {
  type InventoryAlertSummaryApiDTO,
  type InventoryInboundHistoryApiDTO,
  type InventoryInboundRecordApiDTO,
  type InventoryItemApiDTO,
  type InventoryListPageApiDTO,
  type InventoryValuationApiDTO,
} from '../contracts/inventory-api-dto'
import {
  type InboundRecord,
  type InventoryAlertSummary,
  type InventoryRecord,
  type InventoryView,
} from '../data/schema'

export type {
  InboundRecord,
  InventoryAlertSummary,
  InventoryRecord,
  InventoryView,
  MasterDataSearchResult,
} from '../data/schema'

export const InventoryCoreService = {
  getInventoryList: async (): Promise<InventoryView[]> => {
    const res = await apiFetch<InventoryListPageApiDTO>('/inventory?page=1&pageSize=1000')
    const response = ensureObjectResponse<InventoryListPageApiDTO & Record<string, unknown>>(
      res,
      'InventoryCoreService.getInventoryList'
    )
    return toInventoryViewContracts(
      ensureArrayField<InventoryItemApiDTO>(
        response,
        'items',
        'InventoryCoreService.getInventoryList'
      )
    )
  },

  getInventoryListRaw: async (): Promise<InventoryRecord[]> => {
    const res = await apiFetch<InventoryListPageApiDTO>('/inventory')
    const response = ensureObjectResponse<InventoryListPageApiDTO & Record<string, unknown>>(
      res,
      'InventoryCoreService.getInventoryListRaw'
    )
    return ensureArrayField<InventoryItemApiDTO>(
      response,
      'items',
      'InventoryCoreService.getInventoryListRaw'
    ).map(toInventoryRecordContract)
  },

  getInventoryBreakdown: async (materialId: string): Promise<Record<string, number>> => {
    const res = await apiFetch<Record<string, number>>(
      `/inventory/breakdown?materialId=${encodeURIComponent(materialId)}`
    )
    return ensureObjectResponse<Record<string, number>>(
      res,
      'InventoryCoreService.getInventoryBreakdown'
    )
  },

  getInboundHistory: async (): Promise<InboundRecord[]> => {
    const res = await apiFetch<InventoryInboundHistoryApiDTO>('/inventory/inbound')
    const response = ensureObjectResponse<InventoryInboundHistoryApiDTO & Record<string, unknown>>(
      res,
      'InventoryCoreService.getInboundHistory'
    )
    return toInboundRecordContracts(
      ensureArrayField<InventoryInboundRecordApiDTO>(
        response,
        'items',
        'InventoryCoreService.getInboundHistory'
      )
    )
  },

  getCategoryStock: async (materialId: string, category: string): Promise<number> => {
    const res = await apiFetch<{ quantity: number }>(
      `/inventory/stock?materialId=${encodeURIComponent(materialId)}&category=${encodeURIComponent(category)}`
    )
    const response = ensureObjectResponse<{ quantity: number }>(
      res,
      'InventoryCoreService.getCategoryStock'
    )
    return response.quantity
  },

  getInventoryValuation: async (): Promise<number> => {
    const res = await apiFetch<InventoryValuationApiDTO>('/inventory/valuation')
    const response = ensureObjectResponse<InventoryValuationApiDTO & Record<string, unknown>>(
      res,
      'InventoryCoreService.getInventoryValuation'
    )
    return toInventoryValuationContract(response)
  },

  getAlertSummary: async (): Promise<InventoryAlertSummary> => {
    const res = await apiFetch<InventoryAlertSummaryApiDTO>('/inventory/alerts/summary')
    const response = ensureObjectResponse<InventoryAlertSummaryApiDTO & Record<string, unknown>>(
      res,
      'InventoryCoreService.getAlertSummary'
    )
    return toInventoryAlertSummaryContract(response)
  },
}

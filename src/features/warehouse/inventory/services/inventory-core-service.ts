import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  toInboundRecordContracts,
  toInventoryAlertSummaryContract,
  toInventoryRecordContract,
  toInventoryValuationContract,
  toInventoryViewContracts,
  toMasterDataSearchResultContracts,
} from '../adapters/inventory-api-adapter'
import {
  type InventoryAlertSummaryApiDTO,
  type InventoryInboundHistoryApiDTO,
  type InventoryListPageApiDTO,
  type InventoryValuationApiDTO,
  type MasterDataSearchResultApiDTO,
} from '../contracts/inventory-api-dto'
import {
  type InboundRecord,
  type InventoryAlertSummary,
  type InventoryRecord,
  type InventoryView,
  type MasterDataSearchResult,
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
    return toInventoryViewContracts(response.items ?? [])
  },

  getInventoryListRaw: async (): Promise<InventoryRecord[]> => {
    const res = await apiFetch<InventoryListPageApiDTO>('/inventory')
    const response = ensureObjectResponse<InventoryListPageApiDTO & Record<string, unknown>>(
      res,
      'InventoryCoreService.getInventoryListRaw'
    )
    return (response.items ?? []).map(toInventoryRecordContract)
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

  searchMasterData: async (query: string): Promise<MasterDataSearchResult[]> => {
    if (!query) return []

    const res = await apiFetch<MasterDataSearchResultApiDTO[]>(
      `/inventory/search?q=${encodeURIComponent(query)}`
    )
    return toMasterDataSearchResultContracts(
      ensureArrayResponse<MasterDataSearchResultApiDTO>(
        res,
        'InventoryCoreService.searchMasterData'
      )
    )
  },

  getInboundHistory: async (): Promise<InboundRecord[]> => {
    const res = await apiFetch<InventoryInboundHistoryApiDTO>('/inventory/inbound')
    const response = ensureObjectResponse<InventoryInboundHistoryApiDTO & Record<string, unknown>>(
      res,
      'InventoryCoreService.getInboundHistory'
    )
    return toInboundRecordContracts(response.items ?? [])
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
    return toInventoryValuationContract(
      ensureObjectResponse<InventoryValuationApiDTO & Record<string, unknown>>(
        res,
        'InventoryCoreService.getInventoryValuation'
      ) as InventoryValuationApiDTO
    )
  },

  getAlertSummary: async (): Promise<InventoryAlertSummary> => {
    const res = await apiFetch<InventoryAlertSummaryApiDTO>('/inventory/alerts/summary')
    return toInventoryAlertSummaryContract(
      ensureObjectResponse<InventoryAlertSummaryApiDTO & Record<string, unknown>>(
        res,
        'InventoryCoreService.getAlertSummary'
      ) as InventoryAlertSummaryApiDTO
    )
  },
}

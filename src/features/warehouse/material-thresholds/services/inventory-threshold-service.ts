import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  inventoryThresholdRuleListResponseSchema,
  inventoryThresholdRuleSchema,
  inventoryThresholdRuleWritePayloadSchema,
  inventoryThresholdTargetOptionsResponseSchema,
  type InventoryThresholdRule,
  type InventoryThresholdRuleWritePayload,
  type InventoryThresholdTargetOptionsResponse,
} from '../data/schema'

export const InventoryThresholdService = {
  listRules: async (): Promise<InventoryThresholdRule[]> => {
    const res = await apiFetch<unknown>('/warehouse/threshold-rules')
    const payload = ensureObjectResponse<Record<string, unknown>>(
      res,
      'InventoryThresholdService.listRules'
    )
    return inventoryThresholdRuleListResponseSchema.parse(payload).items
  },

  getTargetOptions: async (): Promise<InventoryThresholdTargetOptionsResponse> => {
    const res = await apiFetch<unknown>('/warehouse/threshold-rules/target-options')
    const payload = ensureObjectResponse<Record<string, unknown>>(
      res,
      'InventoryThresholdService.getTargetOptions'
    )
    return inventoryThresholdTargetOptionsResponseSchema.parse(payload)
  },

  createRule: async (payload: InventoryThresholdRuleWritePayload): Promise<InventoryThresholdRule> => {
    const body = inventoryThresholdRuleWritePayloadSchema.parse(payload)
    const res = await apiFetch<unknown>('/warehouse/threshold-rules', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return inventoryThresholdRuleSchema.parse(res)
  },

  updateRule: async (
    id: string,
    payload: InventoryThresholdRuleWritePayload,
  ): Promise<InventoryThresholdRule> => {
    const body = inventoryThresholdRuleWritePayloadSchema.parse(payload)
    const res = await apiFetch<unknown>(`/warehouse/threshold-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return inventoryThresholdRuleSchema.parse(res)
  },

  deleteRule: async (id: string): Promise<void> => {
    await apiFetch(`/warehouse/threshold-rules/${id}`, {
      method: 'DELETE',
    })
  },
}

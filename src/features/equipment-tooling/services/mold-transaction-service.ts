'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  toMoldContract,
  toSaveMoldApiDTO,
} from '../adapters/equipment-mold-api-adapter'
import { type MoldApiDTO } from '../contracts/equipment-mold-api-dto'
import { type Mold, type MoldStatus } from '../data/schema'

export interface MoldCapacityInstance {
  sn: string
  health: number
  status: MoldStatus
}

export interface MoldCapacityCheckResult extends Record<string, unknown> {
  isSufficient: boolean
  totalRemaining: number
  shortage: number
  instances: MoldCapacityInstance[]
}

export interface MoldCapacityAlert {
  modelName: string
  totalQty: number
  isSufficient: boolean
  totalRemaining: number
  shortage: number
  criticalMolds: MoldCapacityInstance[]
}

export const MoldTransactionService = {
  async createMold(
    mold: Omit<Mold, 'id' | 'version' | 'status'>
  ): Promise<Mold> {
    const result = await apiFetch<MoldApiDTO>('/molds', {
      method: 'POST',
      body: JSON.stringify({
        ...toSaveMoldApiDTO({ ...mold, id: '', status: 'IDLE' }),
        metadata: { intent: 'ASSET_INITIAL_REGISTRATION' },
      }),
    })

    return toMoldContract(
      ensureObjectResponse<MoldApiDTO & Record<string, unknown>>(
        result,
        'MoldTransactionService.createMold'
      ) as MoldApiDTO
    )
  },

  async updateTelemetry(moldId: string, cycles: number): Promise<void> {
    await apiFetch(`/molds/${moldId}/telemetry`, {
      method: 'POST',
      body: JSON.stringify({
        cycles,
        metadata: { intent: 'TELEMETRY_SYNC' },
      }),
    })
  },

  async checkMoldCapacity(
    groupName: string,
    requestedQty: number
  ): Promise<MoldCapacityCheckResult> {
    const res = await apiFetch<MoldCapacityCheckResult>(
      `/molds/capacity?groupName=${encodeURIComponent(groupName)}&requestedQty=${requestedQty}`
    )
    return ensureObjectResponse<MoldCapacityCheckResult>(
      res,
      'MoldTransactionService.checkMoldCapacity'
    )
  },

  async checkMoldCapacityAlerts(
    models: { groupName: string; requestedQty: number }[]
  ): Promise<MoldCapacityAlert[]> {
    const res = await apiFetch<MoldCapacityAlert[]>('/molds/capacity-alerts', {
      method: 'POST',
      body: JSON.stringify(models),
    })
    return ensureArrayResponse<MoldCapacityAlert>(
      res,
      'MoldTransactionService.checkMoldCapacityAlerts'
    )
  },
}

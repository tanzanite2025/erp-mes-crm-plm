'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type Mold, type MoldStatus } from '../data/schema'
import { MoldCoreService, VALID_MOLD_STATUS_TRANSITIONS } from './mold-core-service'

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
  async createMold(mold: Omit<Mold, 'id' | 'version' | 'status'>): Promise<Mold> {
    const result = await apiFetch<Mold>('/molds', {
      method: 'POST',
      body: JSON.stringify({
        ...mold,
        status: 'IDLE',
        metadata: { intent: 'ASSET_INITIAL_REGISTRATION' },
      }),
    })
    return ensureObjectResponse<Mold>(result, 'MoldTransactionService.createMold')
  },

  async changeStatus(moldId: string, newStatus: MoldStatus, reason?: string): Promise<void> {
    const mold = await MoldCoreService.getMoldById(moldId)
    const oldStatus = mold.status
    if (oldStatus === newStatus) return

    const allowed = VALID_MOLD_STATUS_TRANSITIONS[oldStatus] || []
    if (!allowed.includes(newStatus)) {
      throw new Error(`[STATUS_GUARD] 闈炴硶鐘舵€佽烦杞? ${mold.sn} [${oldStatus}] -> [${newStatus}]`)
    }

    await apiFetch(`/molds/${moldId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: newStatus,
        reason,
        metadata: {
          intent: `STATUS_TRANSITION_${newStatus}`,
          previousStatus: oldStatus,
        },
      }),
    })
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

  async archiveMold(moldId: string, reason: string): Promise<void> {
    await apiFetch(`/molds/${moldId}/archive`, {
      method: 'POST',
      body: JSON.stringify({
        reason,
        metadata: { intent: 'ASSET_ARCHIVE' },
      }),
    })
  },

  async checkMoldCapacity(groupName: string, requestedQty: number): Promise<MoldCapacityCheckResult> {
    const res = await apiFetch<MoldCapacityCheckResult>(
      `/molds/capacity?groupName=${encodeURIComponent(groupName)}&requestedQty=${requestedQty}`,
    )
    return ensureObjectResponse<MoldCapacityCheckResult>(res, 'MoldTransactionService.checkMoldCapacity')
  },

  async checkMoldCapacityAlerts(
    models: { groupName: string; requestedQty: number }[],
  ): Promise<MoldCapacityAlert[]> {
    const res = await apiFetch<MoldCapacityAlert[]>('/molds/capacity-alerts', {
      method: 'POST',
      body: JSON.stringify(models),
    })
    return ensureArrayResponse<MoldCapacityAlert>(res, 'MoldTransactionService.checkMoldCapacityAlerts')
  },
}

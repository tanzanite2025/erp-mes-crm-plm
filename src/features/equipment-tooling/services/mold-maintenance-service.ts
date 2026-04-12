'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type Mold } from '../data/schema'
import { toMoldContract } from '../adapters/equipment-mold-api-adapter'
import { type MoldApiDTO } from '../contracts/equipment-mold-api-dto'

function containsTopLevelStatusDelta(delta: DeltaSet): boolean {
  return Object.prototype.hasOwnProperty.call(delta, 'status')
}

export const MoldMaintenanceService = {
  async patchMold(moldId: string, delta: DeltaSet, version: number): Promise<Mold> {
    if (containsTopLevelStatusDelta(delta)) {
      throw new Error('[CRITICAL] Mold status transition must use a dedicated transaction command, not MoldMaintenanceService.patchMold().')
    }

    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: {
        id: moldId,
        version,
        intent: 'PHYSICAL_ASSET_REPAIR',
      },
    }

    const res = await apiFetch<MoldApiDTO>(`/molds/${moldId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return toMoldContract(
      ensureObjectResponse<MoldApiDTO & Record<string, unknown>>(
        res,
        'MoldMaintenanceService.patchMold'
      ) as MoldApiDTO
    )
  },

  async saveWithDelta(moldId: string, original: Mold, current: Mold): Promise<void> {
    const { trackDelta } = await import('@/lib/delta/proxy-tracker')
    const tracker = trackDelta(original)

    Object.assign(tracker.data, current)

    const delta = tracker.commit()
    if (Object.keys(delta).length > 0) {
      await this.patchMold(moldId, delta, original.version)
    }
  },
}

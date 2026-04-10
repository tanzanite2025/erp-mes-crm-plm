'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  toFurnaceContract,
  toFurnaceListPageContract,
  toSaveFurnaceApiDTO,
} from '../adapters/equipment-furnace-api-adapter'
import {
  type FurnaceApiDTO,
  type FurnaceListPageApiDTO,
  type FurnaceTelemetryAckApiDTO,
} from '../contracts/equipment-furnace-api-dto'
import { type Furnace } from '../data/schema'

function broadcastFurnaceUpdate() {
  window.dispatchEvent(new CustomEvent('xdfc_furnaces_updated'))
}

export class FurnaceService {
  static async getFurnaces(): Promise<Furnace[]> {
    const res = await apiFetch<FurnaceListPageApiDTO>('/furnaces')
    const page = toFurnaceListPageContract(
      ensureObjectResponse<FurnaceListPageApiDTO & Record<string, unknown>>(
        res,
        'FurnaceService.getFurnaces'
      ) as FurnaceListPageApiDTO
    )

    return page.items
  }

  static async saveFurnace(furnace: Partial<Furnace>): Promise<Furnace> {
    const res = await apiFetch<FurnaceApiDTO>('/furnaces', {
      method: 'POST',
      body: JSON.stringify(toSaveFurnaceApiDTO(furnace)),
    })

    const saved = toFurnaceContract(
      ensureObjectResponse<FurnaceApiDTO & Record<string, unknown>>(
        res,
        'FurnaceService.saveFurnace'
      ) as FurnaceApiDTO
    )

    broadcastFurnaceUpdate()
    return saved
  }

  static async updateTelemetry(furnaceId: string, temp: number): Promise<void> {
    const res = await apiFetch<FurnaceTelemetryAckApiDTO>(`/furnaces/${furnaceId}/telemetry`, {
      method: 'POST',
      body: JSON.stringify({ temp }),
    })

    ensureObjectResponse<FurnaceTelemetryAckApiDTO & Record<string, unknown>>(
      res,
      'FurnaceService.updateTelemetry'
    )
    broadcastFurnaceUpdate()
  }

  static async patchFurnace(furnaceId: string, delta: DeltaSet, version?: number): Promise<Furnace> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id: furnaceId, version },
    }

    const res = await apiFetch<FurnaceApiDTO>(`/furnaces/${furnaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    const saved = toFurnaceContract(
      ensureObjectResponse<FurnaceApiDTO & Record<string, unknown>>(
        res,
        'FurnaceService.patchFurnace'
      ) as FurnaceApiDTO
    )

    broadcastFurnaceUpdate()
    return saved
  }
}

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

function containsTopLevelStatusDelta(delta: DeltaSet): boolean {
  return Object.prototype.hasOwnProperty.call(delta, 'status')
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
  }

  static async patchFurnace(furnaceId: string, delta: DeltaSet, version?: number): Promise<Furnace> {
    if (containsTopLevelStatusDelta(delta)) {
      throw new Error('[CRITICAL] Furnace status transition must use a dedicated transaction command, not FurnaceService.patchFurnace().')
    }

    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id: furnaceId, version, intent: 'ASSET_PROFILE_UPDATE' },
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

    return saved
  }
}

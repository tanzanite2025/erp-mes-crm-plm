'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type MoldDrawing, type MoldDrawingLog } from '../data/schema'
import {
  toMoldDrawingContract,
  toMoldDrawingContracts,
  toMoldDrawingLogContracts,
  toSaveMoldDrawingApiDTO,
} from '../adapters/equipment-drawing-api-adapter'
import {
  type DeleteDrawingAckApiDTO,
  type MoldDrawingApiDTO,
  type MoldDrawingLogApiDTO,
} from '../contracts/equipment-drawing-api-dto'

export const DrawingService = {
  async getDrawings(): Promise<MoldDrawing[]> {
    const data = await apiFetch<MoldDrawingApiDTO[]>('/drawings')
    return toMoldDrawingContracts(
      ensureArrayResponse<MoldDrawingApiDTO>(data, 'DrawingService.getDrawings')
    )
  },

  async getDrawingLogs(drawingId: string): Promise<MoldDrawingLog[]> {
    const logs = await apiFetch<MoldDrawingLogApiDTO[]>(`/drawings/${drawingId}/logs`)
    return toMoldDrawingLogContracts(
      ensureArrayResponse<MoldDrawingLogApiDTO>(logs, 'DrawingService.getDrawingLogs')
    )
  },

  async addDrawing(drawing: MoldDrawing): Promise<MoldDrawing> {
    const result = await apiFetch<MoldDrawingApiDTO>('/drawings', {
      method: 'POST',
      body: JSON.stringify(toSaveMoldDrawingApiDTO(drawing)),
    })

    const saved = toMoldDrawingContract(
      ensureObjectResponse<MoldDrawingApiDTO & Record<string, unknown>>(
        result,
        'DrawingService.addDrawing'
      ) as MoldDrawingApiDTO
    )

    return saved
  },

  async patchDrawing(id: string, delta: DeltaSet, sysVersion: number): Promise<MoldDrawing> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id, version: sysVersion },
    }

    const res = await apiFetch<MoldDrawingApiDTO>(`/drawings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    const saved = toMoldDrawingContract(
      ensureObjectResponse<MoldDrawingApiDTO & Record<string, unknown>>(
        res,
        'DrawingService.patchDrawing'
      ) as MoldDrawingApiDTO
    )

    return saved
  },

  async deleteDrawing(id: string): Promise<void> {
    const res = await apiFetch<DeleteDrawingAckApiDTO>(`/drawings/${id}`, {
      method: 'DELETE',
    })

    ensureObjectResponse<DeleteDrawingAckApiDTO & Record<string, unknown>>(
      res,
      'DrawingService.deleteDrawing'
    )
  },

  async getDrawingsByMold(moldSn: string): Promise<MoldDrawing[]> {
    const response = await apiFetch<MoldDrawingApiDTO[]>(`/drawings/by-mold/${moldSn}`)
    return toMoldDrawingContracts(
      ensureArrayResponse<MoldDrawingApiDTO>(response, 'DrawingService.getDrawingsByMold')
    )
  },
}

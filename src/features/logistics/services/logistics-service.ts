import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  toLogisticsListPageContract,
  toLogisticsRecordContract,
  toSaveLogisticsRecordApiDTO,
} from '../adapters/logistics-api-adapter'
import type { LogisticsListPageApiDTO, LogisticsRecordApiDTO } from '../contracts/logistics-api-dto'
import type { LogisticsListPage, LogisticsRecord, SaveLogisticsRecordInput, UpdateLogisticsStatusPayload } from '../data/schema'

class LogisticsService {
  async getRecords(page = 1, pageSize = 50): Promise<LogisticsListPage> {
    const res = await apiFetch<LogisticsListPageApiDTO>(`/logistics?page=${page}&pageSize=${pageSize}`)
    return toLogisticsListPageContract(
      ensureObjectResponse<LogisticsListPageApiDTO & Record<string, unknown>>(
        res,
        'LogisticsService.getRecords'
      ) as LogisticsListPageApiDTO
    )
  }

  async getRecordById(id: string): Promise<LogisticsRecord> {
    const res = await apiFetch<LogisticsRecordApiDTO>(`/logistics/${id}`)
    return toLogisticsRecordContract(
      ensureObjectResponse<LogisticsRecordApiDTO & Record<string, unknown>>(
        res,
        `LogisticsService.getRecordById(${id})`
      ) as LogisticsRecordApiDTO
    )
  }

  async getRecordsByOrderNo(orderNo: string): Promise<LogisticsRecord[]> {
    const res = await apiFetch<LogisticsListPageApiDTO>(`/logistics?orderNo=${encodeURIComponent(orderNo)}`)
    return toLogisticsListPageContract(
      ensureObjectResponse<LogisticsListPageApiDTO & Record<string, unknown>>(
        res,
        'LogisticsService.getRecordsByOrderNo'
      ) as LogisticsListPageApiDTO
    ).items
  }

  async saveRecord(data: SaveLogisticsRecordInput): Promise<LogisticsRecord> {
    const res = await apiFetch<LogisticsRecordApiDTO>('/logistics', {
      method: 'POST',
      body: JSON.stringify(toSaveLogisticsRecordApiDTO(data)),
    })
    return toLogisticsRecordContract(
      ensureObjectResponse<LogisticsRecordApiDTO & Record<string, unknown>>(
        res,
        'LogisticsService.saveRecord'
      ) as LogisticsRecordApiDTO
    )
  }

  async deleteRecord(id: string): Promise<void> {
    await apiFetch(`/logistics/${id}`, {
      method: 'DELETE',
    })
  }

  async patchLogistics(id: string, delta: DeltaSet, version: number): Promise<LogisticsRecord> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id, version },
    }

    const res = await apiFetch<LogisticsRecordApiDTO>(`/logistics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return toLogisticsRecordContract(
      ensureObjectResponse<LogisticsRecordApiDTO & Record<string, unknown>>(
        res,
        'LogisticsService.patchLogistics'
      ) as LogisticsRecordApiDTO
    )
  }

  async updateStatus(id: string, payload: UpdateLogisticsStatusPayload): Promise<LogisticsRecord> {
    const res = await apiFetch<LogisticsRecordApiDTO>(`/logistics/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return toLogisticsRecordContract(
      ensureObjectResponse<LogisticsRecordApiDTO & Record<string, unknown>>(
        res,
        'LogisticsService.updateStatus'
      ) as LogisticsRecordApiDTO
    )
  }
}

export const logisticsService = new LogisticsService()

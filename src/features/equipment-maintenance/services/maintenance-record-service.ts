'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  toMaintenanceRecordContract,
  toMaintenanceRecordContracts,
} from '../adapters/maintenance-record-api-adapter'
import {
  type MaintenanceRecordApiDTO,
  type SaveMaintenanceRecordApiDTO,
  type MaintenanceRecordStatsApiDTO,
} from '../contracts/maintenance-record-api-dto'
import { type MaintenanceRecord } from '../data/schema'

export interface MaintenanceRecordFilters {
  assetType?: 'MOLD' | 'FURNACE'
  assetId?: string
  status?: string
  priority?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface MaintenanceRecordPagination {
  limit?: number
  offset?: number
}

export class MaintenanceRecordService {
  /**
   * Get maintenance records for a specific asset
   * @param assetType - Asset type ('MOLD' or 'FURNACE')
   * @param assetId - Asset ID
   * @returns Array of maintenance records for the specified asset
   */
  static async getByAsset(
    assetType: string,
    assetId: string
  ): Promise<MaintenanceRecord[]> {
    const params = new URLSearchParams({
      assetType,
      assetId,
    })
    const res = await apiFetch<MaintenanceRecordApiDTO[]>(
      `/maintenance-records?${params.toString()}`
    )
    return toMaintenanceRecordContracts(
      ensureArrayResponse<MaintenanceRecordApiDTO>(
        res,
        'MaintenanceRecordService.getByAsset'
      )
    )
  }

  /**
   * Get all maintenance records with optional filters and pagination
   * @param filters - Optional filters (status, priority, type, date range, search)
   * @param pagination - Optional pagination (limit, offset)
   * @returns Object with records array, total count, limit, and offset
   */
  static async getAll(
    filters?: MaintenanceRecordFilters,
    pagination?: MaintenanceRecordPagination
  ): Promise<{
    records: MaintenanceRecord[]
    total: number
    limit: number
    offset: number
  }> {
    const params = new URLSearchParams()
    if (filters?.assetType) params.append('assetType', filters.assetType)
    if (filters?.assetId) params.append('assetId', filters.assetId)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.priority) params.append('priority', filters.priority)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.append('dateTo', filters.dateTo)
    if (filters?.search) params.append('search', filters.search)
    if (pagination?.limit) params.append('limit', pagination.limit.toString())
    if (pagination?.offset)
      params.append('offset', pagination.offset.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/maintenance-records?${queryString}`
      : '/maintenance-records'

    const res = await apiFetch<{
      records: MaintenanceRecordApiDTO[]
      total: number
      limit: number
      offset: number
    }>(url)

    const data = ensureObjectResponse<
      {
        records: MaintenanceRecordApiDTO[]
        total: number
        limit: number
        offset: number
      } & Record<string, unknown>
    >(res, 'MaintenanceRecordService.getAll')

    return {
      records: toMaintenanceRecordContracts(data.records),
      total: data.total,
      limit: data.limit,
      offset: data.offset,
    }
  }

  /**
   * Get maintenance record statistics grouped by status
   * @returns Statistics object with counts by status
   */
  static async getStats(): Promise<MaintenanceRecordStatsApiDTO> {
    const res = await apiFetch<MaintenanceRecordStatsApiDTO>(
      '/maintenance-records/stats'
    )
    return ensureObjectResponse<
      MaintenanceRecordStatsApiDTO & Record<string, unknown>
    >(res, 'MaintenanceRecordService.getStats') as MaintenanceRecordStatsApiDTO
  }

  /**
   * Create a new maintenance record
   * @param record - Maintenance record data to create
   * @returns The created maintenance record
   */
  static async create(
    record: SaveMaintenanceRecordApiDTO
  ): Promise<MaintenanceRecord> {
    const res = await apiFetch<MaintenanceRecordApiDTO>(
      '/maintenance-records',
      {
        method: 'POST',
        body: JSON.stringify(record),
      }
    )
    return toMaintenanceRecordContract(
      ensureObjectResponse<MaintenanceRecordApiDTO & Record<string, unknown>>(
        res,
        'MaintenanceRecordService.create'
      ) as MaintenanceRecordApiDTO
    )
  }

  /**
   * Patch a maintenance record using delta-based updates
   * @param id - Maintenance record ID
   * @param delta - Delta set containing the fields to update
   * @param version - Current version number for optimistic locking
   * @returns The updated maintenance record
   */
  static async patch(
    id: string,
    delta: DeltaSet,
    version: number
  ): Promise<MaintenanceRecord> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id, version, intent: 'MAINTENANCE_RECORD_UPDATE' },
    }
    const res = await apiFetch<MaintenanceRecordApiDTO>(
      `/maintenance-records/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    )
    return toMaintenanceRecordContract(
      ensureObjectResponse<MaintenanceRecordApiDTO & Record<string, unknown>>(
        res,
        'MaintenanceRecordService.patch'
      ) as MaintenanceRecordApiDTO
    )
  }

  /**
   * Delete a maintenance record (soft delete)
   * @param id - Maintenance record ID to delete
   */
  static async delete(id: string): Promise<void> {
    await apiFetch(`/maintenance-records/${id}`, { method: 'DELETE' })
  }
}

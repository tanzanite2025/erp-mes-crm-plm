import { apiFetch } from '@/lib/api-client'
import { isApiClientError } from '@/lib/api-error'
import {
  ensureArrayField,
  ensureArrayResponse,
  ensureNumberField,
  ensureObjectField,
  ensureObjectResponse,
} from '@/lib/api-response'
import {
  toQualityStandardContract,
  type QualityStandardApiDTO,
  type QualityStandardsListApiResponseDTO,
} from '../adapters/quality-standard-api-adapter'
import type { Standard } from '../data/schema'
import type {
  GetQualityStandardsParams,
  QualityStandardsListMetadata,
} from '../types/quality-standards-list'

export type QualityStandardsResponse = {
  items: Standard[]
  total: number
  page: number
  pageSize: number
  metadata: QualityStandardsListMetadata
  [key: string]: unknown
}

export interface QualityTask {
  id: string
  productionPlanId?: string
  orderId?: string
  productId?: string
  batchNo: string
  productName?: string
  sampleQty?: number
  result: 'PENDING' | 'PASS' | 'FAIL'
  inspector?: string
  remarks?: string
  completedAt?: string | null
}

export type QualityBatchQuantitySettlement = Record<string, unknown> & {
  id: string
  productionPlanId: string
  orderId?: string
  productId: string
  batchNo: string
  inspectionTaskId: string
  inputQuantity: number
  qualifiedQuantity: number
  rejectedQuantity: number
  reworkQuantity: number
  quantityUnit: string
  occurredAt: string
  confirmedAt: string
  confirmedBy: string
}

export type QualityTasksResponse = {
  items: QualityTask[]
  total: number
  [key: string]: unknown
}

function resolveOptionalNumberField(
  source: Record<string, unknown>,
  key: string
) {
  const value = source[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export interface QualityAbnormality {
  id: string
  description: string
  severity: 'CRITICAL' | 'MAJOR' | 'HIGH' | 'MEDIUM' | 'MINOR' | 'LOW'
  status: 'OPEN' | 'CLOSED' | 'REJECTED'
  disposalMethod?: string
  scrapQuantity?: number
  scrapUnit?: string
  productionPlanId?: string
  orderId?: string
  productId?: string
  batchNo?: string
  occurredAt?: string
}

/**
 * QualityCoreService - 专门负责质量模块的只读查询逻辑 (Logic-Hook-UI)情况情况总量。
 */
export const QualityCoreService = {
  /**
   * 分页查询质量标准
   */
  getStandards: async ({
    page,
    pageSize,
    type = 'ALL',
    status = 'ALL',
    keyword = '',
  }: GetQualityStandardsParams): Promise<QualityStandardsResponse> => {
    const context = 'QualityCoreService.getStandards'
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      type,
      status,
    })

    const normalizedKeyword = keyword.trim()
    if (normalizedKeyword) {
      searchParams.set('keyword', normalizedKeyword)
    }

    const res = await apiFetch<QualityStandardsListApiResponseDTO>(
      `/quality/standards?${searchParams.toString()}`
    )
    const payload = ensureObjectResponse<
      QualityStandardsListApiResponseDTO & Record<string, unknown>
    >(res, context)
    const metadata = ensureObjectField<Record<string, unknown>>(
      payload,
      'metadata',
      context
    )
    const pagination = ensureObjectField<Record<string, unknown>>(
      metadata,
      'pagination',
      context
    )
    const stats = ensureObjectField<Record<string, unknown>>(
      metadata,
      'stats',
      context
    )
    const items = ensureArrayField<QualityStandardApiDTO>(
      payload,
      'items',
      context
    )

    return {
      ...payload,
      items: items.map(toQualityStandardContract),
      total: ensureNumberField(payload, 'total', context),
      page: ensureNumberField(payload, 'page', context),
      pageSize: ensureNumberField(payload, 'pageSize', context),
      metadata: {
        pagination: {
          total: ensureNumberField(pagination, 'total', context),
          page: ensureNumberField(pagination, 'page', context),
          pageSize: ensureNumberField(pagination, 'pageSize', context),
        },
        stats: {
          total: ensureNumberField(stats, 'total', context),
          draft: resolveOptionalNumberField(stats, 'draft'),
          pendingApproval: resolveOptionalNumberField(stats, 'pendingApproval'),
          approved: resolveOptionalNumberField(stats, 'approved'),
          rejected: resolveOptionalNumberField(stats, 'rejected'),
          published: resolveOptionalNumberField(stats, 'published'),
          archived: resolveOptionalNumberField(stats, 'archived'),
        },
      },
    }
  },

  /**
   * 按 ID 查询单条质量标准
   */
  getStandardById: async (id: string): Promise<Standard> => {
    const res = await apiFetch<QualityStandardApiDTO>(
      `/quality/standards/${id}`
    )
    const payload = ensureObjectResponse<QualityStandardApiDTO>(
      res,
      'QualityCoreService.getStandardById'
    )

    return toQualityStandardContract(payload)
  },

  /**
   * 分页查询检测任务
   */
  getTasks: async (
    page: number,
    pageSize: number,
    batchNo?: string
  ): Promise<QualityTasksResponse> => {
    const res = await apiFetch<QualityTasksResponse>(
      `/quality/tasks?page=${page}&pageSize=${pageSize}&batchNo=${batchNo || ''}`
    )
    return ensureObjectResponse<QualityTasksResponse>(
      res,
      'QualityCoreService.getTasks'
    )
  },

  getQuantitySettlementByTask: async (
    taskId: string
  ): Promise<QualityBatchQuantitySettlement | null> => {
    try {
      const res = await apiFetch<QualityBatchQuantitySettlement>(
        `/quality/quantity-settlements/task/${taskId}`
      )
      return ensureObjectResponse<QualityBatchQuantitySettlement>(
        res,
        'QualityCoreService.getQuantitySettlementByTask'
      )
    } catch (error) {
      if (isApiClientError(error) && error.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * 查询异常记录
   */
  getAbnormalities: async (): Promise<QualityAbnormality[]> => {
    const res = await apiFetch<QualityAbnormality[]>('/quality/abnormalities')
    return ensureArrayResponse<QualityAbnormality>(
      res,
      'QualityCoreService.getAbnormalities'
    )
  },

  /**
   * 获取质量检测指标概览 (权威汇总)
   */
  getInspectionStats: async (): Promise<{
    pendingCount: number
    passCount: number
    failCount: number
  }> => {
    const res = await apiFetch<{
      pendingCount: number
      passCount: number
      failCount: number
    }>('/quality/stats')
    return ensureObjectResponse<{
      pendingCount: number
      passCount: number
      failCount: number
    }>(res, 'QualityCoreService.getInspectionStats')
  },
}

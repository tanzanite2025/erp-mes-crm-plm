import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaSet, type DeltaPayload } from '@/lib/delta/types'
import {
  toQualityStandardApiDTO,
  toQualityStandardContract,
  type QualityStandardApiDTO,
} from '../adapters/quality-standard-api-adapter'
import type { Standard } from '../data/schema'

export interface ExecuteInspectionPayload {
  id: string
  result?: 'PENDING' | 'PASS' | 'FAIL'
  remarks?: string
}

export interface RecordQualityAbnormalityDisposalPayload {
  disposalMethod: 'SCRAP' | 'REWORK' | 'CONCESSION'
  scrapQuantity?: number | null
  scrapUnit?: string
  productionPlanId?: string
  orderId?: string
  productId?: string
  batchNo?: string
  occurredAt?: string
}

/**
 * QualityMaintenanceService - 专门负责质量模块的维护与写入逻辑 (SDRTS 协议封装)情况情况总量。
 */
export const QualityMaintenanceService = {
  /**
   * 保存质量标准 (支持创建与 SDRTS Patch)
   */
  saveStandard: async (params: {
    data: Partial<Standard>
    isPatch?: boolean
    delta?: DeltaSet
  }): Promise<Standard> => {
    const { data, isPatch, delta } = params

    if (isPatch && data.id && delta) {
      const payload: DeltaPayload = {
        op: 'PATCH',
        delta,
        metadata: { id: data.id, version: (data as Standard).version },
      }
      const res = await apiFetch<QualityStandardApiDTO>(
        `/quality/standards/${data.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      )
      return toQualityStandardContract(
        ensureObjectResponse<QualityStandardApiDTO>(
          res,
          'QualityMaintenanceService.saveStandard.patch'
        )
      )
    }

    const res = await apiFetch<QualityStandardApiDTO>('/quality/standards', {
      method: 'POST',
      body: JSON.stringify(toQualityStandardApiDTO(data)),
    })

    return toQualityStandardContract(
      ensureObjectResponse<QualityStandardApiDTO>(
        res,
        'QualityMaintenanceService.saveStandard.create'
      )
    )
  },

  /**
   * 执行质量检测任务
   */
  executeInspection: async (data: ExecuteInspectionPayload): Promise<void> => {
    await apiFetch('/quality/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  recordAbnormalityDisposal: async (
    id: string,
    data: RecordQualityAbnormalityDisposalPayload
  ) => {
    return apiFetch(`/quality/abnormalities/${id}/disposal`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

import { apiFetch } from '@/lib/api-client'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { buildVersionedPatchMetadata } from '@/lib/version-guard'
import { logisticsService } from '../../logistics/services/logistics-service'
import type {
  ControlledTrackingOrder,
  LogisticsTrackingRefreshResult,
} from '../../logistics/data/schema'

const PURCHASE_LOGISTICS_RECORD_PATCH_INTENT_SAVE = 'PURCHASE_LOGISTICS_RECORD_PATCH_SAVE'

export interface LogisticsEvent {
  id: string
  time: string
  location: string
  description: string
  status: string
}

export interface PurchaseLogisticsRecord {
  id: string
  orderNo: string
  purchaseOrderId?: string
  purchaseOrder?: {
    id: string
    orderNo: string
    supplierName: string
    status: string
  }
  salesOrderId?: string
  carrier: string
  trackingNo: string
  status: 'Pending' | 'InTransit' | 'Delivered' | 'Canceled'
  lastLocation?: string
  events: LogisticsEvent[] | string // 后端可能返回 JSON 字符串或解析后的对象
  version: number
  updatedAt: string
}

export interface PurchaseControlledTrackingDetail {
  order: ControlledTrackingOrder
  events: LogisticsEvent[]
  refresh?: LogisticsTrackingRefreshResult
}

interface PurchaseLogisticsApiRecord extends Omit<PurchaseLogisticsRecord, 'events'> {
  events?: unknown
}

interface PurchaseLogisticsApiListResponse {
  items?: PurchaseLogisticsApiRecord[]
  total?: number
  page?: number
  pageSize?: number
}

export interface PurchaseLogisticsListResponse {
  items?: PurchaseLogisticsRecord[]
  total?: number
  page?: number
  pageSize?: number
}

function normalizeLogisticsEvents(raw: unknown): LogisticsEvent[] {
  if (Array.isArray(raw)) {
    return raw as LogisticsEvent[]
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as LogisticsEvent[]) : []
    } catch (_error) {
      return []
    }
  }

  return []
}

export const PurchaseLogisticsService = {
  /**
   * 获取所有物流记录，可选按采购订单过滤 (带数据规范化)
   */
  async getRecords(params?: { purchaseOrderId?: string; page?: number; pageSize?: number }): Promise<PurchaseLogisticsListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.purchaseOrderId) searchParams.append('purchaseOrderId', params.purchaseOrderId)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())

    const queryString = searchParams.toString()
    const res = await apiFetch<PurchaseLogisticsApiListResponse>(`/logistics${queryString ? `?${queryString}` : ''}`)

    return {
      ...res,
      items: res.items?.map((item) => this.normalizeRecord(item)),
    }
  },

  /**
   * 保存或更新物流记录
   */
  async saveRecord(record: Partial<PurchaseLogisticsRecord>) {
    return apiFetch('/logistics', {
      method: 'POST',
      body: JSON.stringify({
        ...record,
        type: 'Receipt' // 强制指定类型为采购入库物流
      }),
    })
  },

  async getControlledTrackingDetail(
    trackingNo: string,
    options: { refresh?: boolean } = {}
  ): Promise<PurchaseControlledTrackingDetail | null> {
    const detail = await logisticsService.getControlledTrackingDetail(trackingNo, options)
    if (!detail) {
      return null
    }

    return {
      order: detail.order,
      refresh: detail.refresh,
      events: detail.events.map((event) => ({
        id: event.id,
        time: event.time,
        location: event.location,
        description: event.description,
        status: event.status,
      })),
    }
  },

  /**
   * 规范化记录：处理 JSON 字符串等问题
   */
  normalizeRecord(record: PurchaseLogisticsApiRecord): PurchaseLogisticsRecord {
    return {
      ...record,
      events: normalizeLogisticsEvents(record.events)
    }
  },

  /**
   * 更新物流状态并追加事件
   */
  async updateStatus(id: string, data: {
    status: string
    location: string
    description: string
    events: LogisticsEvent[]
    version: number
  }) {
    return apiFetch(`/logistics/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * 局部更新物流记录 (SDRTS 协议)
   */
  async patchRecord(id: string, delta: DeltaSet, version: number): Promise<PurchaseLogisticsRecord> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: buildVersionedPatchMetadata(id, version, 'PurchaseLogisticsService.patchRecord', {
        intent: PURCHASE_LOGISTICS_RECORD_PATCH_INTENT_SAVE,
      })
    };

    return apiFetch<PurchaseLogisticsRecord>(`/logistics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

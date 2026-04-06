import { apiFetch } from '@/lib/api-client'

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

export const PurchaseLogisticsService = {
  /**
   * 获取所有物流记录，可选按采购订单过滤 (带数据规范化)
   */
  async getRecords(params?: { purchaseOrderId?: string; page?: number; pageSize?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.purchaseOrderId) searchParams.append('purchaseOrderId', params.purchaseOrderId)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())

    const queryString = searchParams.toString()
    const res = await apiFetch(`/logistics${queryString ? `?${queryString}` : ''}`) as any
    
    // 数据规范化：确保 events 始终为数组
    if (res && res.items) {
      res.items = res.items.map((item: any) => this.normalizeRecord(item))
    }
    return res
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

  /**
   * 规范化记录：处理 JSON 字符串等问题
   */
  normalizeRecord(record: any): PurchaseLogisticsRecord {
    let events = record.events
    if (typeof events === 'string') {
      try {
        events = JSON.parse(events)
      } catch (e) {
        events = []
      }
    }
    return {
      ...record,
      events: Array.isArray(events) ? events : []
    }
  },

  /**
   * 更新物流状态并追加事件
   */
  async updateStatus(id: string, data: {
    status: string
    location: string
    description: string
    events: any[]
    version: number
  }) {
    return apiFetch(`/logistics/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
}

import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'

export interface DailyProductionRecord {
  date: Date
  output: number
  hasIssues: boolean
  items: {
    name: string
    orderNo: string
    quantity: number
    status: string
  }[]
}

export interface MonthlyStats {
  totalOutput: number
  estimatedValue: string
}

export interface OrderProgress {
  id: string
  orderNo: string
  customer: string
  target: number
  completed: number
  wip: number
}

type ProductionStatsResponse = {
  completedToday?: number
}

type ProductionPlanItem = {
  status?: string
  endDate?: string
  quantity?: number
  productName?: string
  orderNo?: string
}

type ProductionPlansResponse = {
  items?: ProductionPlanItem[]
}

export const ProductionCalendarService = {
  async getMonthlyStats(_month: Date): Promise<MonthlyStats> {
    const stats = await apiFetch<ProductionStatsResponse>('/production/stats')
    const normalizedStats = ensureObjectResponse<ProductionStatsResponse>(
      stats,
      'Production monthly stats',
    )

    return {
      totalOutput: normalizedStats.completedToday ?? 0,
      estimatedValue: 'SYNC_REALTIME',
    }
  },

  async getAllRecords(): Promise<DailyProductionRecord[]> {
    const response = await apiFetch<ProductionPlansResponse>('/production/plans?pageSize=1000')
    const plans = ensureArrayField<ProductionPlanItem>(response, 'items', 'Production plans')
    const recordsMap: Record<string, DailyProductionRecord> = {}

    plans.forEach((plan) => {
      if (plan.status !== 'COMPLETED' || !plan.endDate) return

      const date = new Date(plan.endDate)
      const dateKey = date.toISOString().split('T')[0]

      if (!recordsMap[dateKey]) {
        recordsMap[dateKey] = {
          date,
          output: 0,
          hasIssues: false,
          items: [],
        }
      }

      recordsMap[dateKey].output += plan.quantity ?? 1
      recordsMap[dateKey].items.push({
        name: plan.productName || '未知产品',
        orderNo: plan.orderNo || '-',
        quantity: plan.quantity ?? 1,
        status: '已完工',
      })
    })

    return Object.values(recordsMap)
  },

  async getOrderProgress(): Promise<OrderProgress[]> {
    const response = await apiFetch<unknown>('/production/order-progress')
    return ensureArrayResponse<OrderProgress>(response, 'Production order progress')
  },

  async getDayDetails(date: Date): Promise<DailyProductionRecord | null> {
    const records = await this.getAllRecords()
    const targetKey = date.toISOString().split('T')[0]
    const record = records.find(
      (item) => new Date(item.date).toISOString().split('T')[0] === targetKey,
    )

    return record ?? null
  },
}

import { TraceService } from '@/features/dashboard/services/trace-service'
import { NotificationGateway } from '@/features/system-mgmt/notifications/notification-gateway'
import {
  buildSafeAiPageContext,
  normalizeAiContextTitle,
} from '../utils/ai-page-context'
import type { DashboardSummary } from './prompt-builder'

/**
 * AI 工业上下文感知服务 (AI Context Sensing Service)
 * 职责：作为极光助手的“数字感官”，统一采集、过滤并压缩全厂运营快照。
 * 核心原则：真值唯一 (SSOT)，确保背景 Agent 与手动助手的数据同源。
 */
export const aiContextService = {
  /**
   * 采集核心运营快照 (KPIs + Alerts + Events)
   * @param isMobile 是否为移动端载荷（自适应压缩）
   */
  async grabFullSnapshot(isMobile = false): Promise<DashboardSummary> {
    // 1. KPI 采集
    const stats = await TraceService.getDashboardStats()
    if (!stats) {
      throw new Error(
        '[CRITICAL] Context sensing failed: TraceService.getDashboardStats returned null.'
      )
    }

    // 2. 状态告警聚合 (从通知中心状态获取)
    const messages = NotificationGateway.getMessages()
    const alerts = {
      critical: messages.filter((m) => m.priority === 'critical').length,
      error: messages.filter((m) => m.priority === 'error').length,
      warning: messages.filter((m) => m.priority === 'warning').length,
    }

    // 3. 事件摘要与内容压缩 (基于设备能力)
    const maxEvents = isMobile ? 2 : 5
    const recentEvents = messages.slice(0, maxEvents).map((m) => {
      const time = new Date(m.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      return `[${time}] ${m.title}: ${m.content}`
    })

    return {
      kpis: {
        wip: stats.wip,
        scrap: stats.scrap,
        scrapDelta: stats.scrapDelta,
        gapOrders: stats.gapOrders,
        totalSn: stats.totalSn,
      },
      alerts,
      recentEvents,
    }
  },

  /**
   * 注入局部页面上下文 (用于深度分析，如特定的工单或 BOM)
   */
  async injectLocalContext(
    title: string,
    data: Record<string, unknown>
  ): Promise<Partial<DashboardSummary>> {
    return {
      localContext: {
        title: normalizeAiContextTitle(title),
        data: buildSafeAiPageContext(data),
      },
    }
  },
}

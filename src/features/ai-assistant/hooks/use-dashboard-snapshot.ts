import { aiContextService } from '../services/ai-context-service'
import { type DashboardSummary } from '../services/ai-service'

/**
 * 仪表盘即时快照钩子
 * 用于在点击 AI 按钮的一瞬间，获取 5 个 TAB 的汇总数据。
 * [加固]: 现已接入统一上下文服务，确保数据全链路一致。
 */
export function useDashboardSnapshot() {
  const getSnapshot = async (): Promise<DashboardSummary> => {
    const isMobile = window.innerWidth < 768
    return aiContextService.grabFullSnapshot(isMobile)
  }

  return { getSnapshot }
}

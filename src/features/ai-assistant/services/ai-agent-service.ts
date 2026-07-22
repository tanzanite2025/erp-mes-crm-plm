export type AgentSessionType = 'AM_REVIEW' | 'PM_FORECAST' | 'WEEKLY_REPORT'

export interface AgentServiceState {
  hasUnread: boolean
  lastError: string | null
}

/**
 * AI 对话入口的轻量状态协调器。
 *
 * 这里不启动任何后台任务；模型调用只发生在用户打开 AI 弹窗并输入问题之后。
 * hasUnread / lastInsight 仅用于兼容 AI 弹窗的“简报模式”展示状态。
 */
class AiAgentService {
  private hasUnread = false
  private lastInsight = ''
  private lastType: AgentSessionType = 'AM_REVIEW'
  private lastError: string | null = null
  private onStatusChange: (() => void) | null = null

  subscribe(callback: () => void) {
    this.onStatusChange = callback
  }

  getHasUnread() {
    return this.hasUnread
  }

  getLastInsight() {
    return this.lastInsight
  }

  getLastType() {
    return this.lastType
  }

  getLastError() {
    return this.lastError
  }

  clearLastError() {
    this.lastError = null
    this.onStatusChange?.()
  }

  getState(): AgentServiceState {
    return {
      hasUnread: this.hasUnread,
      lastError: this.lastError,
    }
  }

  markAsRead() {
    this.hasUnread = false
    this.onStatusChange?.()
  }
}

export const aiAgentService = new AiAgentService()

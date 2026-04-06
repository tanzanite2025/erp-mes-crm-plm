import { callProviderStream } from './ai-service'
import { aiContextService } from './ai-context-service'
import { 
  generateAgentBriefPrompt, 
  generateWeeklyAgentPrompt,
  type AgentSessionType 
} from './prompt-builder'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AiAgentService')

export interface AgentSettings {
  dailyEnabled: boolean
  weeklyEnabled: boolean
  amHour: number
  pmHour: number
  weeklyDay: number
  weeklyHour: number
}

interface AgentRunStatus {
  lastDailyId: string | null
  lastWeeklyId: string | null
  timestamp: number
}

const AGENT_STATUS_KEY = 'xdfc_ai_agent_run_status'
const AGENT_SETTINGS_KEY = 'xdfc_ai_agent_settings'

const DEFAULT_SETTINGS: AgentSettings = {
  dailyEnabled: true,
  weeklyEnabled: true,
  amHour: 9,
  pmHour: 18,
  weeklyDay: 1,
  weeklyHour: 8,
}

class AiAgentService {
  private isRunning = false
  private hasUnread = false
  private lastInsight = ''
  private lastType: AgentSessionType = 'AM_REVIEW'
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
    return this.lastType ?? 'AM_REVIEW'
  }

  markAsRead() {
    this.hasUnread = false
    this.onStatusChange?.()
  }

  async getSettings(): Promise<AgentSettings> {
    const saved = await StorageService.getItem<AgentSettings>(AGENT_SETTINGS_KEY)
    return saved || DEFAULT_SETTINGS
  }

  async updateSettings(settings: Partial<AgentSettings>) {
    const current = await this.getSettings()
    await StorageService.setItem(AGENT_SETTINGS_KEY, { ...current, ...settings })
  }

  async forceRun(type: AgentSessionType) {
    logger.info(`Force running ${type}...`)
    await this.executeAgentTask(type, `FORCE_${Date.now()}`)
  }

  async checkAndRun() {
    if (this.isRunning) return

    const settings = await this.getSettings()
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    const dateStr = now.toISOString().split('T')[0]
    const weekStr = this.getYearWeek(now)

    const status = await this.getRunStatus()

    if (settings.weeklyEnabled && day === settings.weeklyDay && hour >= settings.weeklyHour) {
      if (status.lastWeeklyId !== weekStr) {
        await this.executeAgentTask('WEEKLY_REPORT', weekStr)
        return
      }
    }

    if (settings.dailyEnabled) {
      let sessionType: AgentSessionType | null = null
      let sessionId: string | null = null

      if (hour >= settings.amHour && hour < 12) {
        sessionType = 'AM_REVIEW'
        sessionId = `${dateStr}_AM`
      } else if (hour >= settings.pmHour && hour < 21) {
        sessionType = 'PM_FORECAST'
        sessionId = `${dateStr}_PM`
      }

      if (sessionType && sessionId) {
        if (status.lastDailyId !== sessionId) {
          await this.executeAgentTask(sessionType, sessionId)
        }
      }
    }
  }

  private async executeAgentTask(type: AgentSessionType, id: string) {
    if (this.isRunning) return
    this.isRunning = true

    try {
      // 1. 统一数据采集
      const data = await aiContextService.grabFullSnapshot(false) // PC 端全量载荷
      
      // 2. 统一协议注入 (通过 prompt-builder 生成基于 DCL 的提示词)
      const prompt = type === 'WEEKLY_REPORT' 
        ? generateWeeklyAgentPrompt(data) 
        : generateAgentBriefPrompt(data, type)

      let fullContent = ''
      await callProviderStream([{ role: 'user', content: prompt }], (chunk) => {
        fullContent += chunk
        this.lastInsight = fullContent
        this.lastType = type
      })

      this.hasUnread = true
      this.onStatusChange?.()

      if (!id.startsWith('FORCE_')) {
        await this.markRunComplete(type, id)
      }
    } catch (error: any) {
      logger.error('Critical failure during task execution', error)
      // [FAIL_LOUDLY]: 向用户通报背景任务异常
      toast.error(`[AI 任务异常] 场景: ${type}，详情: ${error?.message || '未知错误'}`)
    } finally {
      this.isRunning = false
    }
  }

  private getYearWeek(date: Date): string {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return `${date.getFullYear()}_W${Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)}`
  }

  private async getRunStatus(): Promise<AgentRunStatus> {
    const saved = await StorageService.getItem<AgentRunStatus>(AGENT_STATUS_KEY)
    return saved || { lastDailyId: null, lastWeeklyId: null, timestamp: 0 }
  }

  private async markRunComplete(type: AgentSessionType, id: string) {
    const status = await this.getRunStatus()
    if (type === 'WEEKLY_REPORT') status.lastWeeklyId = id
    else status.lastDailyId = id
    status.timestamp = Date.now()
    await StorageService.setItem(AGENT_STATUS_KEY, status)
  }
}

export const aiAgentService = new AiAgentService()
export type { AgentSessionType } from './prompt-builder'

import type { AgentSessionType } from './ai-agent-service'
import {
  callProvider as callProviderCore,
  callProviderStream as callProviderStreamCore,
  type ChatMessage,
} from './provider-client'
import {
  generateAiPrompt as generateAiPromptCore,
  generateAgentBriefPrompt as generateAgentBriefPromptCore,
  generateWeeklyAgentPrompt as generateWeeklyAgentPromptCore,
  generateAgentCommandPrompt as generateAgentCommandPromptCore,
  type DashboardSummary,
} from './prompt-builder'

import { AgentProtocol } from './agent-protocol'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AiService')

// VERSION: 1.1.0-context-aware-chat

export type { DashboardSummary, ChatMessage }

export const generateAiPrompt = (data: DashboardSummary, isBrief = true): string =>
  generateAiPromptCore(data, isBrief)

export async function callProviderStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  snapshot?: DashboardSummary
): Promise<void> {
  // 如果提供了快照，注入工业 DCL 协议作为系统引导
  const chatContext = [...messages]
  if (snapshot) {
    const protocolContext = AgentProtocol.toContextDCL(snapshot)
    const systemProtocol = AgentProtocol.getSystemProtocol()
    // 注入为第一条系统消息或前置引导
    chatContext.unshift({
      role: 'system',
      content: `${systemProtocol}\n\n${protocolContext}`
    })
  }
  
  await callProviderStreamCore(chatContext, onChunk)
}

export function generateAgentBriefPrompt(data: DashboardSummary, type: AgentSessionType): string {
  return generateAgentBriefPromptCore(data, type)
}

export function generateWeeklyAgentPrompt(data: DashboardSummary): string {
  return generateWeeklyAgentPromptCore(data)
}

export const generateAgentCommandPrompt = (data: DashboardSummary, command: string): string =>
  generateAgentCommandPromptCore(data, command)

function buildAiUnavailableMessage(data: DashboardSummary): string {
  const isStandby =
    data.kpis.wip === 0 &&
    data.kpis.scrap === 0 &&
    data.kpis.gapOrders === 0 &&
    data.alerts.critical === 0 &&
    data.alerts.error === 0 &&
    data.alerts.warning === 0 &&
    data.recentEvents.length === 0

  const eventLines = data.recentEvents.slice(0, 3)
  const eventBlock =
    eventLines.length > 0
      ? eventLines.map((event) => `- ${event}`).join('\n')
      : '- 暂无最新业务事件'

  return [
    'AI 服务暂时不可用，当前已切换为本地中文提示模式。',
    '请检查 AI 配置、API Key 或网络连接后重试。',
    '',
    isStandby
      ? '当前看板数据显示为待机状态，暂未发现活跃生产或异常波动。'
      : '已根据当前看板快照生成简要中文摘要，供您先行判断。',
    '',
    '当前快照：',
    `- 全线在制：${data.kpis.wip} 件`,
    `- 异常损耗：${data.kpis.scrap} 件（变化 ${data.kpis.scrapDelta > 0 ? '+' : ''}${data.kpis.scrapDelta}）`,
    `- 交付缺口：${data.kpis.gapOrders} 单`,
    `- 告警汇总：严重 ${data.alerts.critical} / 错误 ${data.alerts.error} / 警告 ${data.alerts.warning}`,
    '',
    '最近事件：',
    eventBlock,
    '',
    '建议优先检查：',
    '[CMD: 排查排产瓶颈 | 检查排程依赖、工单释放状态与设备可用性]',
    '[CMD: 分析近期损耗趋势 | 查看最近 5 天异常损耗记录并定位主要来源]',
  ].join('\n')
}

export const fetchAiInsight = async (
  data: DashboardSummary,
  onChunk?: (text: string) => void,
): Promise<string> => {
  try {
    const prompt = generateAiPrompt(data, true)
    if (onChunk) {
      await callProviderStreamCore([{ role: 'user', content: prompt }], onChunk)
      return ''
    }
    return await callProviderCore([{ role: 'user', content: prompt }])
  } catch (error: any) {
    logger.error('Real API failed, falling back to mock', error?.message)
    const mockReply = buildAiUnavailableMessage(data)

    if (onChunk) onChunk(mockReply)
    return mockReply
  }
}

export const chatWithAi = async (
  history: ChatMessage[],
  onChunk?: (text: string) => void,
): Promise<string> => {
  try {
    if (onChunk) {
      await callProviderStreamCore(history, onChunk)
      return ''
    }
    return await callProviderCore(history)
  } catch (error: any) {
    const errMsg = [
      'AI 对话暂时不可用，请检查 API 配置或网络连接后重试。',
      '[CMD: 检查 AI 连接配置 | 核对当前提供商、模型、API Key 与代理设置]',
    ].join('\n')
    if (onChunk) onChunk(errMsg)
    return errMsg
  }
}

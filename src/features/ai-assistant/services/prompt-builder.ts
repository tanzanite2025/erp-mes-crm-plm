import { AgentProtocol } from './agent-protocol'

export interface DashboardSummary {
  kpis: {
    wip: number
    scrap: number
    scrapDelta: number
    gapOrders: number
    totalSn: number
  }
  alerts: {
    critical: number
    error: number
    warning: number
  }
  recentEvents: string[]
  localContext?: {
    title: string
    data: Record<string, any>
  }
}

export type AgentSessionType =
  | 'AM_REVIEW'
  | 'PM_FORECAST'
  | 'WEEKLY_REPORT'
  | 'CRITICAL_ALERT'
  | string

export function generateAiPrompt(
  data: DashboardSummary,
  isBrief = true
): string {
  const context = AgentProtocol.toContextDCL(data)

  return `
${AgentProtocol.getSystemProtocol()}

${context}

${
  data.localContext
    ? `
[ACTIVE_PAGE_CONTEXT] 
- 标题: ${data.localContext.title}
- 业务数据: ${JSON.stringify(data.localContext.data, null, 2)}
`
    : ''
}

Action General_Assessment {
  意图 = "请输出一份适合管理层快速阅读的运营摘要";
  范围 = ["KPI_Radar", "Risk_Radar", "Action_Items"];
}

Rules:
${isBrief ? '- 保持回答简洁，不要输出推理过程。' : ''}
- 所有输出必须使用简体中文。
- 先给结论，再给依据，最后给行动建议。
- 如果所有 KPI 都为 0 且没有事件，明确说明系统可能处于待机或数据未接入状态，并给出 2 个自检 [CMD: ...] 动作。
- 输出使用 Markdown。
`.trim()
}

export function generateAgentBriefPrompt(
  data: DashboardSummary,
  type: AgentSessionType
): string {
  const isAM = type === 'AM_REVIEW'
  const context = AgentProtocol.toContextDCL(data)

  return `
${AgentProtocol.getSystemProtocol()}

${context}

Action Operating_Brief {
  意图 = "${isAM ? '早会复盘：总结昨日偏差，分析今日开局风险' : '晚间预判：评估今日交付达成，识别明晨瓶颈'}";
  约束 = ["结论优先", "数据驱动", "可执行建议"];
}

Rules:
1. 始终使用简体中文。
2. 识别关键 KPI 异常（如 WIP 堆积或损耗突增）。
3. 结尾附上 2-3 条 [CMD: ...] 指令引导用户深入分析。
`.trim()
}

export function generateWeeklyAgentPrompt(data: DashboardSummary): string {
  const context = AgentProtocol.toContextDCL(data)

  return `
${AgentProtocol.getSystemProtocol()}

${context}

Action Weekly_Audit {
  意图 = "周度运营审计：分析本周生产节拍与交付缺口的趋势平衡";
  范围 = ["趋势分析", "瓶颈识别", "下周建议"];
}

Requirements:
1. 评估当前产能与订单缺口的差额风险。
2. 给出 3 条具备工业逻辑的流程优化建议。
3. 全文使用简体中文。
`.trim()
}

export function generateAgentCommandPrompt(
  data: DashboardSummary,
  command: string
): string {
  const context = AgentProtocol.toContextDCL(data)
  const action = AgentProtocol.toActionDCL('Custom_Analysis', command)

  return `
${AgentProtocol.getSystemProtocol()}

${context}

${
  data.localContext
    ? `
[COMMAND_TARGET_FOCUS]
- 页面: ${data.localContext.title}
- 深度模型: ${JSON.stringify(data.localContext.data, null, 2)}
`
    : ''
}

${action}

Requirements:
1. 严格按照 Action 意图执行。
2. 仅使用 Context 作为事实依据。
3. 所有输出必须使用简体中文。
4. 以极光助手的身份直接给出结论与建议。
`.trim()
}

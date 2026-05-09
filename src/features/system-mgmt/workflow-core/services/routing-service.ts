import { apiFetch } from '@/lib/api-client'
import { type DeltaSet } from '@/lib/delta/types'
import {
  deserializeBusinessEventSource,
  deserializeBusinessEventSources,
  serializeBusinessEventSourceCreate,
  serializeBusinessEventSourceUpdate,
  type BusinessEventSource,
  type BusinessStatus,
  type BusinessEventSourceCreatePayload,
  type BusinessEventSourceUpdatePayload,
} from '../data/business-event-source-schema'
import {
  deserializeNotificationRule,
  deserializeNotificationRules,
  serializeNotificationRule,
  type NotificationRule,
  type NotificationRuleWritePayload,
} from '../data/notification-rule-schema'
import {
  deserializeRuleExecutionLog,
  deserializeRuleExecutionLogPage,
  serializeRuleExecutionLog,
  type RuleExecutionLog,
  type RuleExecutionLogPage,
  type RuleExecutionLogWritePayload,
} from '../data/rule-execution-log-schema'
import { type StandardCommand } from '../data/schema'

export interface BusinessEventStatusRenameTransactionPayload {
  expectedUpdatedAt?: string
  statuses: Array<Pick<BusinessStatus, 'id' | 'order' | 'code'>>
  affectedRules: Array<{
    ruleId: string
    expectedVersion: number
  }>
}

export interface BusinessEventStatusRenameTransactionResult {
  eventSource: BusinessEventSource
  rules: NotificationRule[]
  summary: {
    renamedStatusCount: number
    affectedRuleCount: number
    targetSegmentCount: number
    resolveSegmentCount: number
    derivedApprovalActionCount: number
  }
}

/**
 * 路由与指令模板服务 - 统一对接后端
 */
export const RoutingService = {
  getEventSources: async (): Promise<BusinessEventSource[]> => {
    const response = await apiFetch<unknown>('/system/routing/event-sources')
    return deserializeBusinessEventSources(response)
  },

  saveEventSource: async (
    source: BusinessEventSourceCreatePayload
  ): Promise<BusinessEventSource> => {
    const response = await apiFetch<unknown>('/system/routing/event-sources', {
      method: 'POST',
      body: JSON.stringify(serializeBusinessEventSourceCreate(source)),
    })
    return deserializeBusinessEventSource(response)
  },

  updateEventSource: async (
    id: string,
    updates: BusinessEventSourceUpdatePayload
  ): Promise<BusinessEventSource> => {
    const response = await apiFetch<unknown>(
      `/system/routing/event-sources/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(serializeBusinessEventSourceUpdate(updates)),
      }
    )
    return deserializeBusinessEventSource(response)
  },

  commitEventSourceStatusRenameTransaction: async (
    id: string,
    payload: BusinessEventStatusRenameTransactionPayload
  ): Promise<BusinessEventStatusRenameTransactionResult> => {
    const response = await apiFetch<{
      eventSource: unknown
      rules: unknown
      summary: BusinessEventStatusRenameTransactionResult['summary']
    }>(`/system/routing/event-sources/${id}/status-rename-transaction`, {
      method: 'POST',
      body: JSON.stringify({
        expectedUpdatedAt: payload.expectedUpdatedAt,
        statuses: payload.statuses.map((status, index) => ({
          id: status.id,
          order: status.order ?? index,
          code: status.code,
        })),
        affectedRules: payload.affectedRules,
      }),
    })

    return {
      eventSource: deserializeBusinessEventSource(response.eventSource),
      rules: deserializeNotificationRules(response.rules),
      summary: response.summary,
    }
  },

  deleteEventSource: async (id: string): Promise<void> => {
    return apiFetch(`/system/routing/event-sources/${id}`, {
      method: 'DELETE',
    })
  },

  // --- 指令模板 (Commands) ---
  getCommands: async (): Promise<StandardCommand[]> => {
    return apiFetch<StandardCommand[]>('/system/routing/commands')
  },

  saveCommand: async (
    command: Partial<StandardCommand>
  ): Promise<StandardCommand> => {
    return apiFetch<StandardCommand>('/system/routing/commands', {
      method: 'POST',
      body: JSON.stringify(command),
    })
  },

  updateCommand: async (
    id: string,
    updates: Partial<StandardCommand>
  ): Promise<StandardCommand> => {
    return apiFetch<StandardCommand>(`/system/routing/commands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  deleteCommand: async (id: string): Promise<void> => {
    return apiFetch(`/system/routing/commands/${id}`, {
      method: 'DELETE',
    })
  },

  /** 局部更新指令配置 (SDRTS) */
  patchCommand: async (
    id: string,
    delta: DeltaSet,
    version: number
  ): Promise<StandardCommand> => {
    return apiFetch<StandardCommand>(`/system/routing/commands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ op: 'PATCH', delta, metadata: { id, version } }),
    })
  },

  // --- 通知规则 (Rules) ---
  getRules: async (): Promise<NotificationRule[]> => {
    const response = await apiFetch<unknown>('/system/routing/rules')
    return deserializeNotificationRules(response)
  },

  saveRule: async (
    rule: NotificationRuleWritePayload
  ): Promise<NotificationRule> => {
    const response = await apiFetch<unknown>('/system/routing/rules', {
      method: 'POST',
      body: JSON.stringify(serializeNotificationRule(rule)),
    })
    return deserializeNotificationRule(response)
  },

  updateRule: async (
    id: string,
    updates: NotificationRuleWritePayload
  ): Promise<NotificationRule> => {
    const response = await apiFetch<unknown>(`/system/routing/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(serializeNotificationRule(updates)),
    })
    return deserializeNotificationRule(response)
  },

  deleteRule: async (id: string): Promise<void> => {
    return apiFetch(`/system/routing/rules/${id}`, {
      method: 'DELETE',
    })
  },

  /** 局部更新通知规则 (SDRTS) */
  patchRule: async (
    id: string,
    delta: DeltaSet,
    version: number
  ): Promise<NotificationRule> => {
    return apiFetch<NotificationRule>(`/system/routing/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ op: 'PATCH', delta, metadata: { id, version } }),
    })
  },

  getExecutionLogs: async (
    query: Partial<{
      page: number
      pageSize: number
      eventKey: string
      entity: string
      sourceCode: string
      actionCode: string
      statusCode: string
      ruleId: string
      segmentId: string
      executionType: string
      executionStatus: string
    }> = {}
  ): Promise<RuleExecutionLogPage> => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      params.set(key, String(value))
    })
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const response = await apiFetch<unknown>(
      `/system/routing/execution-logs${suffix}`
    )
    return deserializeRuleExecutionLogPage(response)
  },

  recordExecutionLog: async (
    payload: RuleExecutionLogWritePayload
  ): Promise<RuleExecutionLog> => {
    const response = await apiFetch<unknown>('/system/routing/execution-logs', {
      method: 'POST',
      body: JSON.stringify(serializeRuleExecutionLog(payload)),
    })
    return deserializeRuleExecutionLog(response)
  },
}

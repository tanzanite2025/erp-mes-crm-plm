import { apiFetch } from '@/lib/api-client'
import { type StandardCommand } from '../data/schema'
import { type NotificationRule } from '../data/notification-rule-schema'

/**
 * 路由与指令模板服务 - 统一对接后端
 */
export const RoutingService = {
  // --- 指令模板 (Commands) ---
  getCommands: async (): Promise<StandardCommand[]> => {
    return apiFetch<StandardCommand[]>('/system/routing/commands')
  },

  saveCommand: async (command: Partial<StandardCommand>): Promise<StandardCommand> => {
    return apiFetch<StandardCommand>('/system/routing/commands', {
      method: 'POST',
      body: JSON.stringify(command),
    })
  },

  updateCommand: async (id: string, updates: Partial<StandardCommand>): Promise<StandardCommand> => {
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

  // --- 通知规则 (Rules) ---
  getRules: async (): Promise<NotificationRule[]> => {
    return apiFetch<NotificationRule[]>('/system/routing/rules')
  },

  saveRule: async (rule: Partial<NotificationRule>): Promise<NotificationRule> => {
    return apiFetch<NotificationRule>('/system/routing/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    })
  },

  updateRule: async (id: string, updates: Partial<NotificationRule>): Promise<NotificationRule> => {
    return apiFetch<NotificationRule>(`/system/routing/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  deleteRule: async (id: string): Promise<void> => {
    return apiFetch(`/system/routing/rules/${id}`, {
      method: 'DELETE',
    })
  },
}

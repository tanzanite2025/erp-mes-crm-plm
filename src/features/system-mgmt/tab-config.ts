import type { TabItem } from '@/components/module-tabs'

export const systemManagementTabs: TabItem[] = [
  { key: 'status', label: '系统状态', href: '/system-management' },
  { key: 'routing', label: '消息路由', href: '/system-management/routing' },
  { key: 'ai-capability', label: 'AI 能力管控', href: '/system-management/ai-capability' },
  { key: 'audit-engine', label: '审计引擎', href: '/system-management/audit-engine' },
]

import type { TabItem } from '@/components/module-tabs'

export const systemManagementTabs: TabItem[] = [
  { key: 'status', label: 'System Status', href: '/system-management' },
  { key: 'accounts', label: 'Role Matrix', href: '/system-management/accounts' },
  {
    key: 'workflow-definition',
    label: 'Sales Workflow',
    href: '/system-management/workflow-definition',
  },
  { key: 'ai-capability', label: 'AI Capability', href: '/system-management/ai-capability' },
  { key: 'audit-engine', label: 'Audit Engine', href: '/system-management/audit-engine' },
]

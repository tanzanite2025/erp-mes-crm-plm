import type { TabItem } from '@/components/module-tabs'

export const systemManagementTabs: TabItem[] = [
  { key: 'status', label: 'System Status', href: '/system-management' },
  {
    key: 'ai-capability',
    label: 'AI Capability',
    href: '/system-management/ai-capability',
  },
  {
    key: 'audit-engine',
    label: 'Audit Engine',
    href: '/system-management/audit-engine',
  },
  {
    key: 'api-management',
    label: 'API Management',
    href: '/system-management/api-management',
  },
]

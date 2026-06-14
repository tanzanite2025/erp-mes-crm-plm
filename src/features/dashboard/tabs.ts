import type { TranslationKey } from '@/locales'
import type { TabItem } from '@/components/module-tabs'
import { generatePermissionId } from '@/features/authz/data/permission-catalog'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export const dashboardTabs: TabItem[] = [
  {
    key: 'overview',
    label: '全厂概览',
    href: '/dashboard/overview',
    permissionId: generatePermissionId('tab', '/dashboard/overview'),
  },
  {
    key: 'calendar',
    label: '生产日历',
    href: '/dashboard/calendar',
    permissionId: generatePermissionId('tab', '/dashboard/calendar'),
  },
  {
    key: 'reports',
    label: '交付进度',
    href: '/dashboard/reports',
    permissionId: generatePermissionId('tab', '/dashboard/reports'),
  },
  {
    key: 'notifications',
    label: '系统全域动态',
    href: '/dashboard/notifications',
    permissionId: generatePermissionId('tab', '/dashboard/notifications'),
  },
]

export function getDashboardTabs(t: TranslateFn): TabItem[] {
  return [
    {
      key: 'overview',
      label: t('dashboard.page.tabs.overview'),
      href: '/dashboard/overview',
      permissionId: generatePermissionId('tab', '/dashboard/overview'),
    },
    {
      key: 'calendar',
      label: t('dashboard.page.tabs.calendar'),
      href: '/dashboard/calendar',
      permissionId: generatePermissionId('tab', '/dashboard/calendar'),
    },
    {
      key: 'reports',
      label: t('dashboard.page.tabs.reports'),
      href: '/dashboard/reports',
      permissionId: generatePermissionId('tab', '/dashboard/reports'),
    },
    {
      key: 'notifications',
      label: t('dashboard.page.tabs.notifications'),
      href: '/dashboard/notifications',
      permissionId: generatePermissionId('tab', '/dashboard/notifications'),
    },
  ]
}

import { describe, expect, it } from 'vitest'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import type { NavGroup } from './types'

const navGroups: NavGroup[] = [
  {
    id: 'production',
    title: 'Production',
    children: [
      {
        id: 'planning',
        title: 'Planning',
        children: [
          {
            id: 'aps',
            title: 'APS',
            url: '/aps',
          },
        ],
      },
    ],
  },
  {
    id: 'materials',
    title: 'Materials',
    children: [
      {
        id: 'engine-config',
        title: 'Engine configuration',
        children: [
          {
            id: 'cutting-engine',
            title: 'Cutting engine',
            url: '/raw-materials-engine/config',
            activeMatch: '/raw-materials-engine',
          },
        ],
      },
    ],
  },
  {
    id: 'org',
    title: 'Organization',
    children: [
      {
        id: 'org-personnel',
        title: 'Organization & Personnel',
        children: [
          {
            id: 'attendance-management',
            title: 'Attendance Management',
            url: '/attendance-management/leave',
            activeMatch: '/attendance-management',
          },
        ],
      },
    ],
  },
  {
    id: 'system-management-root',
    title: 'System Management',
    children: [
      {
        id: 'quick-actions-group',
        title: 'Quick Actions',
        children: [
          {
            id: 'sidebar-command-config',
            title: 'Quick Action Command Config',
            url: '/sidebar-command/library',
            activeMatch: '/sidebar-command',
          },
        ],
      },
    ],
  },
  {
    id: 'business-analysis',
    title: 'Business Analysis',
    children: [
      {
        id: 'analysis-aggregation-group',
        title: 'Analysis Aggregation',
        children: [
          {
            id: 'production-analysis-center',
            title: 'Production Analysis Center',
            url: '/business-analysis/production-capacity',
            activeMatches: [
              '/business-analysis/production-capacity',
              '/business-analysis/production-load',
              '/business-analysis/production-efficiency',
            ],
          },
          {
            id: 'quality-analysis-center',
            title: 'Quality Analysis Center',
            url: '/business-analysis/scrap',
            activeMatches: [
              '/business-analysis/scrap',
              '/business-analysis/defect-trend',
            ],
          },
          {
            id: 'customer-sales-analysis-center',
            title: 'Customer & Sales Analysis Center',
            url: '/business-analysis/orders',
            activeMatches: [
              '/business-analysis/orders',
              '/business-analysis/customers',
            ],
          },
        ],
      },
    ],
  },
]

describe('resolveActiveSidebarPath', () => {
  it('returns the complete group, branch, and destination chain', () => {
    expect(resolveActiveSidebarPath(navGroups, '/aps/jobs/42')).toEqual({
      groupId: 'production',
      nodeIds: ['planning', 'aps'],
      key: 'production/planning/aps',
    })
  })

  it('uses activeMatch for sibling module routes', () => {
    expect(
      resolveActiveSidebarPath(
        navGroups,
        '/raw-materials-engine/cutting-simulation'
      )
    ).toEqual({
      groupId: 'materials',
      nodeIds: ['engine-config', 'cutting-engine'],
      key: 'materials/engine-config/cutting-engine',
    })
  })

  it('returns null when the filtered navigation has no matching route', () => {
    expect(resolveActiveSidebarPath(navGroups, '/system-management')).toBeNull()
  })

  it('keeps sibling tab routes under their owning sidebar domain', () => {
    expect(
      resolveActiveSidebarPath(navGroups, '/attendance-management/hall-of-fame')
    ).toEqual({
      groupId: 'org',
      nodeIds: ['org-personnel', 'attendance-management'],
      key: 'org/org-personnel/attendance-management',
    })
  })

  it('keeps command assignment under the quick action configuration domain', () => {
    expect(
      resolveActiveSidebarPath(navGroups, '/sidebar-command/assignment')
    ).toEqual({
      groupId: 'system-management-root',
      nodeIds: ['quick-actions-group', 'sidebar-command-config'],
      key: 'system-management-root/quick-actions-group/sidebar-command-config',
    })
  })

  it('keeps quality analysis tabs under the quality analysis domain', () => {
    expect(
      resolveActiveSidebarPath(navGroups, '/business-analysis/scrap')
    ).toEqual({
      groupId: 'business-analysis',
      nodeIds: ['analysis-aggregation-group', 'quality-analysis-center'],
      key: 'business-analysis/analysis-aggregation-group/quality-analysis-center',
    })
  })
})

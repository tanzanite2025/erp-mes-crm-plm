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
})

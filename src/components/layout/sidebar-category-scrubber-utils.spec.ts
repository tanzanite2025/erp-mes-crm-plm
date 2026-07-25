import { describe, expect, it } from 'vitest'
import {
  calculateFloatingPosition,
  createSidebarCategoryPreviews,
} from './sidebar-category-scrubber-utils'
import type { NavGroup } from './types'

describe('sidebar category scrubber utils', () => {
  it('builds top-level category previews from the existing nav tree', () => {
    const navGroups: NavGroup[] = [
      {
        id: 'production-management',
        title: '生产管理',
        children: [
          {
            id: 'planning-center-group',
            title: '计划中心',
            children: [
              {
                id: 'mrp',
                title: 'MRP',
                url: '/mrp',
              },
            ],
          },
          {
            id: 'production-coordination-group',
            title: '生产协同',
            children: [
              {
                id: 'production-analysis',
                title: '生产分析',
                url: '/business-analysis/production-capacity',
                activeMatches: [
                  '/business-analysis/production-capacity',
                  '/business-analysis/production-load',
                ],
              },
            ],
          },
        ],
      },
    ]

    expect(createSidebarCategoryPreviews(navGroups)).toEqual([
      {
        id: 'production-management',
        title: '生产管理',
        directLinks: [],
        linkCount: 2,
        sections: [
          {
            id: 'planning-center-group',
            title: '计划中心',
            links: [
              {
                id: 'mrp',
                title: 'MRP',
                url: '/mrp',
                icon: undefined,
                badge: undefined,
              },
            ],
          },
          {
            id: 'production-coordination-group',
            title: '生产协同',
            links: [
              {
                id: 'production-analysis',
                title: '生产分析',
                url: '/business-analysis/production-capacity',
                icon: undefined,
                badge: undefined,
              },
            ],
          },
        ],
      },
    ])
  })

  it('keeps direct group links separate from L1 sections', () => {
    const navGroups: NavGroup[] = [
      {
        id: 'resource-management',
        title: '资源管理',
        children: [
          {
            id: 'dashboard',
            title: '仪表盘',
            url: '/dashboard',
          },
        ],
      },
    ]

    const [preview] = createSidebarCategoryPreviews(navGroups)

    expect(preview.directLinks).toEqual([
      {
        id: 'dashboard',
        title: '仪表盘',
        url: '/dashboard',
        icon: undefined,
        badge: undefined,
      },
    ])
    expect(preview.sections).toEqual([])
    expect(preview.linkCount).toBe(1)
  })

  it('clamps floating card position inside the viewport', () => {
    const anchorRect = {
      top: 760,
      right: 760,
      height: 12,
    } as DOMRect

    expect(
      calculateFloatingPosition({
        anchorRect,
        floatingWidth: 360,
        floatingHeight: 300,
        viewportWidth: 800,
        viewportHeight: 800,
      })
    ).toEqual({
      top: 488,
      left: 428,
    })
  })
})

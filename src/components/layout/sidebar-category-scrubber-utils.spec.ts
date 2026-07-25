import { describe, expect, it } from 'vitest'
import {
  calculateFloatingPosition,
  createSidebarCategoryPreviews,
  resolveSidebarScrubberPointerTarget,
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

  it('assigns the gap between two scrubber bars to the nearest category', () => {
    const targets = [
      { id: 'trading', top: 0, bottom: 10 },
      { id: 'production', top: 20, bottom: 30 },
      { id: 'quality', top: 40, bottom: 50 },
    ]

    expect(resolveSidebarScrubberPointerTarget({ pointerY: 12, targets })).toBe(
      'trading'
    )
    expect(resolveSidebarScrubberPointerTarget({ pointerY: 18, targets })).toBe(
      'production'
    )
    expect(resolveSidebarScrubberPointerTarget({ pointerY: 35, targets })).toBe(
      'quality'
    )
  })

  it('keeps a continuous pointer target at the beginning and end of the scrubber rail', () => {
    const targets = [
      { id: 'trading', top: 100, bottom: 124 },
      { id: 'production', top: 140, bottom: 164 },
    ]

    expect(resolveSidebarScrubberPointerTarget({ pointerY: 90, targets })).toBe(
      'trading'
    )
    expect(
      resolveSidebarScrubberPointerTarget({ pointerY: 180, targets })
    ).toBe('production')
  })
})

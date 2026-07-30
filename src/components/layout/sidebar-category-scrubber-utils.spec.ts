import { describe, expect, it } from 'vitest'
import { createSidebarCategoryPreviews } from './sidebar-category-scrubber-utils'
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
                tabs: [],
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
                tabs: [],
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
        tabs: [],
        icon: undefined,
        badge: undefined,
      },
    ])
    expect(preview.sections).toEqual([])
    expect(preview.linkCount).toBe(1)
  })

  it('keeps domain links and tab links as separate levels', () => {
    const navGroups: NavGroup[] = [
      {
        id: 'finance',
        title: '财务',
        children: [
          {
            id: 'finance-config',
            title: '财务配置',
            children: [
              {
                id: 'finance-center',
                title: '财务配置',
                url: '/finance-management',
              },
            ],
          },
        ],
      },
    ]

    const [preview] = createSidebarCategoryPreviews(navGroups, (node) =>
      node.id === 'finance-center'
        ? [
            {
              key: 'payment-methods',
              label: '支付方式',
              href: '/finance-management/payment-methods',
            },
            {
              key: 'payment-terms',
              label: '结算方式',
              href: '/finance-management/payment-terms',
            },
          ]
        : []
    )

    expect(preview.linkCount).toBe(2)
    expect(preview.sections[0].links[0]).toMatchObject({
      id: 'finance-center',
      title: '财务配置',
      url: '/finance-management',
      tabs: [
        {
          id: 'payment-methods',
          title: '支付方式',
          url: '/finance-management/payment-methods',
        },
        {
          id: 'payment-terms',
          title: '结算方式',
          url: '/finance-management/payment-terms',
        },
      ],
    })
  })
})

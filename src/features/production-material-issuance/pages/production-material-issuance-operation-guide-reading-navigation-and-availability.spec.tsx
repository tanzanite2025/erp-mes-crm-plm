// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { translate, type TranslationKey } from '@/locales'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { getSidebarData } from '@/components/layout/data/sidebar-data'
import { resolveActiveSidebarPath } from '@/components/layout/sidebar-active-path'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import {
  getProjectedTabsFromPermissionSnapshot,
  matchesPathPermissionProjection,
} from '@/features/authz/guards/route-access'
import { buildHomeBusinessShortcutCategories } from '@/features/home/data/build-home-business-shortcut-categories'
import { getMrpTabs } from '@/features/mrp/tabs'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import { getProductionMaterialIssuanceOperationGuideTabs } from '../production-material-issuance-operation-guide-tab-config'
import { ProductionMaterialIssuanceOperationGuidePage } from './production-material-issuance-operation-guide-page'

const productionIssuanceGuideReader = vi.hoisted(() => ({
  user: { permissions: ['tab_mrp_production_material_issuance_guide'] },
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: typeof productionIssuanceGuideReader) => unknown
  ) => select(productionIssuanceGuideReader),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
beforeEach(() => {
  productionIssuanceGuideReader.user.permissions = [
    'tab_mrp_production_material_issuance_guide',
  ]
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderProductionMaterialIssuanceOperationGuide(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='production-issuance-operation-guide-test-language'
    >
      <ProductionMaterialIssuanceOperationGuidePage />
    </LanguageProvider>
  )
}
function selectProductionMaterialIssuanceGuideChapter(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), {
    button: 0,
    ctrlKey: false,
  })
}

describe('production material issuance guide availability, reading and navigation', () => {
  it('provides an independent handbook, home card and route label without business access', () => {
    const path = '/mrp/production-material-issuance-guide'
    const translateIssuanceGuideLabel = (key: TranslationKey) =>
      translate('zh-CN', key)
    const user = productionIssuanceGuideReader.user
    const groups = getSidebarData(translateIssuanceGuideLabel).navGroups
    expect(getAuthenticatedRoutePaths()).toContain(path)
    expect(matchesPathPermissionProjection(user, path)).toBe(true)
    expect(
      matchesPathPermissionProjection({ permissions: ['menu_mrp'] }, path)
    ).toBe(true)
    expect(matchesPathPermissionProjection(user, '/warehouse')).toBe(false)
    expect(
      matchesPathPermissionProjection(user, '/mrp/production-material-issuance')
    ).toBe(false)
    expect(
      getProjectedTabsFromPermissionSnapshot(
        user,
        getMrpTabs(translateIssuanceGuideLabel)
      )
    ).toEqual([])
    expect(
      getProductionMaterialIssuanceOperationGuideTabs(
        translateIssuanceGuideLabel
      ).map((tab) => tab.href)
    ).toEqual([path])
    expect(
      resolveActiveSidebarPath(getAccessibleNavGroups(user, groups), path)
        ?.nodeIds
    ).toEqual([
      'production-handbook-group',
      'production-material-issuance-handbook',
    ])
    const shortcuts = buildHomeBusinessShortcutCategories(
      user,
      groups,
      translateIssuanceGuideLabel
    ).flatMap((category) => category.shortcuts)
    expect(shortcuts).toMatchObject([
      {
        title: '如何生产领料',
        url: path,
        description: expect.stringContaining('原单发料'),
      },
    ])
    expect(resolveRecentVisitLabelKey(path)).toBe(
      'mrp.productionMaterialIssuanceGuide.title'
    )
  })

  it('keeps the heading, availability and five chapters outside the scrolling reading area without business requests', () => {
    const fetchBusinessData = vi.fn()
    vi.stubGlobal('fetch', fetchBusinessData)
    renderProductionMaterialIssuanceOperationGuide()
    const reading = screen.getByRole('region', { name: '生产领料指南正文' })
    const heading = screen.getByRole('heading', {
      level: 1,
      name: '如何生产领料',
    })
    expect(reading).not.toContainElement(heading)
    expect(reading).not.toContainElement(screen.getByRole('note'))
    expect(screen.getByRole('note')).toHaveTextContent('原单领退已接入')
    expect(screen.getAllByRole('tab')).toHaveLength(5)
    for (const name of [
      '下发与打印',
      '仓库确认发料',
      '补料与退料',
      '核对与异常',
      '确定备料范围',
    ]) {
      reading.scrollTop = 200
      selectProductionMaterialIssuanceGuideChapter(name)
      expect(reading.scrollTop).toBe(0)
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      expect(screen.getByRole('tab', { name })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    }
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /发送至仓库|确认发料|保存/ })
    ).not.toBeInTheDocument()
    expect(fetchBusinessData).not.toHaveBeenCalled()
  })

  it('distinguishes available document handovers from reference printing and future overall progress', () => {
    renderProductionMaterialIssuanceOperationGuide()
    selectProductionMaterialIssuanceGuideChapter('下发与打印')
    expect(screen.getByText(/当前打印不会生成正式领料单/)).toBeInTheDocument()
    expect(screen.getByText(/核对生产领料依据.*确认下发/)).toBeInTheDocument()
    expect(screen.getByText(/重打只重新输出原单据/)).toBeInTheDocument()
    selectProductionMaterialIssuanceGuideChapter('补料与退料')
    expect(screen.getByText(/累计已领仍为 4,030/)).toBeInTheDocument()
    expect(screen.getByText(/这不能说明实际消耗了 4,020/)).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: '查看生产领料数量口径' })
    )
    expect(
      screen.getByRole('dialog', { name: '这些数量分别代表什么' })
    ).toHaveTextContent('累计已领 − 累计退料')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    selectProductionMaterialIssuanceGuideChapter('核对与异常')
    expect(
      screen.getByText(/多份适用配方需明确选择性能版本/)
    ).toBeInTheDocument()
  })

  it('only exposes existing reference pages when the reader can access them', () => {
    renderProductionMaterialIssuanceOperationGuide()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    cleanup()
    productionIssuanceGuideReader.user.permissions.push(
      'tab_mrp_production_material_issuance'
    )
    renderProductionMaterialIssuanceOperationGuide()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: '查看生产领料工作区' })
    ).toHaveAttribute('href', '/mrp/production-material-issuance')
  })

  it('explains shared requirements, undispatched sources and confirmed order-line allocations without offsetting shortages', () => {
    renderProductionMaterialIssuanceOperationGuide()
    expect(screen.getByText(/两页共用需求依据/)).toBeInTheDocument()
    expect(screen.getByText(/未下发来源也纳入/)).toBeInTheDocument()
    expect(
      screen.getByText(/一次确认时保留每条订单行的领料归属/)
    ).toBeInTheDocument()
    selectProductionMaterialIssuanceGuideChapter('仓库确认发料')
    expect(screen.getByText(/合计必须等于本次数量/)).toBeInTheDocument()
    selectProductionMaterialIssuanceGuideChapter('补料与退料')
    expect(screen.getByText(/原单内选择“退料”及原发料分配/)).toBeInTheDocument()
    selectProductionMaterialIssuanceGuideChapter('核对与异常')
    expect(
      screen.getByText(/待领 40、超标准 20，不能相互抵消/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/需求、库存缺口和包装计算统一沿用料号需求/)
    ).toBeInTheDocument()
  })

  it('provides the same five chapters and availability in English', () => {
    renderProductionMaterialIssuanceOperationGuide('en-US')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'How to issue production materials',
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(
      'Overall progress and document handovers available'
    )
    for (const name of [
      'Preparation scope',
      'Dispatch and print',
      'Warehouse confirmation',
      'Supplements and returns',
      'Verify and resolve',
    ]) {
      selectProductionMaterialIssuanceGuideChapter(name)
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      expect(document.body.textContent).not.toContain(
        'mrp.productionMaterialIssuanceGuide.'
      )
    }
  })
})

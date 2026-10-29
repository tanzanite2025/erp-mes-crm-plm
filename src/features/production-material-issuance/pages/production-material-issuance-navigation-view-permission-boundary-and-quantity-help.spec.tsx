// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { translate, type TranslationKey } from '@/locales'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
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
import { ProductionMaterialIssuancePage } from './production-material-issuance-page'

const productionIssuanceReader = vi.hoisted(() => ({
  user: { permissions: ['tab_mrp_production_material_issuance'] },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof productionIssuanceReader) => unknown) =>
    select(productionIssuanceReader),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

beforeEach(() => {
  productionIssuanceReader.user.permissions = [
    'tab_mrp_production_material_issuance',
  ]
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderProductionMaterialIssuanceWorkspace(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='production-issuance-workspace-test-language'
    >
      <ProductionMaterialIssuancePage />
    </LanguageProvider>
  )
}

describe('production material issuance navigation and view permission boundaries', () => {
  it('registers a separate business tab, sidebar selection, home entry, and recent-visit label without extending its access', () => {
    const path = '/mrp/production-material-issuance'
    const translateIssuanceLabel = (key: TranslationKey) =>
      translate('zh-CN', key)
    const tabs = getMrpTabs(translateIssuanceLabel)
    const mrpReader = { permissions: ['menu_mrp'] }
    expect(getAuthenticatedRoutePaths()).toContain(path)
    expect(
      getProjectedTabsFromPermissionSnapshot(mrpReader, tabs).map(
        (tab) => tab.href
      )
    ).toEqual(['/mrp/requirements', path])
    expect(
      getProjectedTabsFromPermissionSnapshot(
        productionIssuanceReader.user,
        tabs
      ).map((tab) => tab.href)
    ).toEqual([path])
    expect(
      getProjectedTabsFromPermissionSnapshot(
        { permissions: ['tab_mrp_requirements'] },
        tabs
      ).map((tab) => tab.href)
    ).toEqual(['/mrp/requirements'])
    expect(
      matchesPathPermissionProjection(
        productionIssuanceReader.user,
        '/mrp/requirements'
      )
    ).toBe(false)
    expect(
      matchesPathPermissionProjection(
        productionIssuanceReader.user,
        '/warehouse'
      )
    ).toBe(false)
    const groups = getSidebarData(translateIssuanceLabel).navGroups
    expect(
      resolveActiveSidebarPath(getAccessibleNavGroups(mrpReader, groups), path)
        ?.nodeIds
    ).toEqual(['planning-center-group', 'mrp'])
    const shortcuts = buildHomeBusinessShortcutCategories(
      mrpReader,
      groups,
      translateIssuanceLabel
    ).flatMap((category) => category.shortcuts)
    expect(shortcuts.filter((shortcut) => shortcut.url === path)).toMatchObject(
      [{ title: '生产领料' }]
    )
    expect(resolveRecentVisitLabelKey(path)).toBe(
      'mrp.productionMaterialIssuance.title'
    )
  })

  it('requires view permission before reading progress and offers no unauthorized cross-domain links', () => {
    const fetchBusinessData = vi.fn()
    vi.stubGlobal('fetch', fetchBusinessData)
    renderProductionMaterialIssuanceWorkspace()
    expect(screen.getByRole('note')).toHaveTextContent(
      '净已领 = 累计已领 − 退料'
    )
    for (const name of ['订单范围与需求依据', '订单行领料进度', '单据追溯']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    const scope = screen.getByRole('region', { name: '订单范围与需求依据' })
    expect(scope).toHaveTextContent('未下发的订单行也要纳入')
    expect(screen.getByRole('tab', { name: '按订单查看' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    fireEvent.mouseDown(screen.getByRole('tab', { name: '按订单查看' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByRole('region', { name: '订单行领料进度' })
    ).toHaveTextContent('仓库确认时保留每条订单行的领料归属')
    expect(
      screen.queryByRole('region', { name: '物料待领汇总' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '订单范围与需求依据' })).toBe(
      scope
    )
    expect(screen.getByRole('region', { name: '单据追溯' })).toBeInTheDocument()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    fireEvent.mouseDown(screen.getByRole('tab', { name: '按物料汇总' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByRole('region', { name: '物料待领汇总' })
    ).toHaveTextContent('超领单独显示')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /新建|保存|确认发料/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(fetchBusinessData).not.toHaveBeenCalled()
  })

  it('explains confirmed issues, returns, outstanding quantities and supplements in a reusable popover', () => {
    productionIssuanceReader.user.permissions = ['menu_mrp', 'menu_warehouse']
    renderProductionMaterialIssuanceWorkspace()
    fireEvent.click(screen.getByRole('button', { name: '领料相关页面' }))
    expect(screen.getByRole('link', { name: '查看料号需求' })).toHaveAttribute(
      'href',
      '/mrp/requirements'
    )
    expect(screen.getByRole('link', { name: '查询仓库库存' })).toHaveAttribute(
      'href',
      '/warehouse'
    )
    fireEvent.keyDown(screen.getByRole('link', { name: '查询仓库库存' }), {
      key: 'Escape',
    })
    fireEvent.click(
      screen.getByRole('button', { name: '查看生产领料数量口径' })
    )
    const help = screen.getByRole('dialog', { name: '这些数量分别代表什么' })
    expect(within(help).getByText(/待发申请不计入/)).toBeInTheDocument()
    expect(within(help).getByText(/确认前不冲减净领料/)).toBeInTheDocument()
    expect(
      within(help).getByText(/最低为 0.*不直接等于采购缺口/)
    ).toBeInTheDocument()
    expect(
      within(help).getByText(/在原单上追加补料并记录原因/)
    ).toBeInTheDocument()
    expect(
      within(help).getByText(/A 行超领 20、B 行待领 40/)
    ).toBeInTheDocument()
    expect(within(help).queryByText('库存缺口')).not.toBeInTheDocument()
    fireEvent.keyDown(help, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '按物料汇总' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByText(/需求、库存缺口与包装换算沿用料号需求/)
    ).toBeInTheDocument()
  })

  it('provides the same view permission boundary and quantity explanation in English', () => {
    renderProductionMaterialIssuanceWorkspace('en-US')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Production Material Issuance',
      })
    ).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'By order' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByRole('region', { name: 'Order-line issuance progress' })
    ).toHaveTextContent('Allocation does not establish consumption')
    expect(screen.getByRole('note')).toHaveTextContent(
      'Net issued = total issued − returns'
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Explain production issuance quantities',
      })
    )
    expect(
      screen.getByRole('dialog', { name: 'What these quantities mean' })
    ).toHaveTextContent('Total issued − total returned')
    expect(document.body.textContent).not.toContain(
      'mrp.productionMaterialIssuance.'
    )
  })
})

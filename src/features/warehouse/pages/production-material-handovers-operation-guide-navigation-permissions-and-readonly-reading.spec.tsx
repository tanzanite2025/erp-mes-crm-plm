// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { translate, type TranslationKey } from '@/locales'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { buildGlobalSearchNavigationItems } from '@/components/layout/data/global-search-navigation-catalog'
import { getSidebarData } from '@/components/layout/data/sidebar-data'
import { resolveActiveSidebarPath } from '@/components/layout/sidebar-active-path'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import {
  getProjectedTabsFromPermissionSnapshot,
  matchesPathPermissionProjection,
} from '@/features/authz/guards/route-access'
import { buildHomeBusinessShortcutCategories } from '@/features/home/data/build-home-business-shortcut-categories'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import {
  getWarehouseProductionMaterialHandoversOperationGuideTabs,
  getWarehouseTabs,
} from '../tabs'
import { ProductionMaterialHandoversOperationGuidePage } from './production-material-handovers-operation-guide-page'

const productionHandoverGuideReader = vi.hoisted(() => ({
  user: { permissions: ['tab_warehouse_production_material_handovers_guide'] },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: typeof productionHandoverGuideReader) => unknown
  ) => select(productionHandoverGuideReader),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

beforeEach(() => {
  productionHandoverGuideReader.user.permissions = [
    'tab_warehouse_production_material_handovers_guide',
  ]
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderProductionMaterialHandoversOperationGuide(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='warehouse-production-handovers-guide-test-language'
    >
      <ProductionMaterialHandoversOperationGuidePage />
    </LanguageProvider>
  )
}

function selectProductionMaterialHandoversOperationGuideChapter(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), {
    button: 0,
    ctrlKey: false,
  })
}

describe('warehouse production handover handbook', () => {
  it('is discoverable in the warehouse handbook, home, search and recent visits with guide-only access', () => {
    const path = '/warehouse/production-material-handovers-guide'
    const translateProductionHandoverGuideLabel = (key: TranslationKey) =>
      translate('zh-CN', key)
    const user = productionHandoverGuideReader.user
    const groups = getSidebarData(
      translateProductionHandoverGuideLabel
    ).navGroups
    expect(getAuthenticatedRoutePaths()).toContain(path)
    expect(matchesPathPermissionProjection(user, path)).toBe(true)
    expect(
      matchesPathPermissionProjection({ permissions: ['menu_warehouse'] }, path)
    ).toBe(true)
    expect(matchesPathPermissionProjection({ permissions: [] }, path)).toBe(
      false
    )
    expect(
      matchesPathPermissionProjection(
        user,
        '/warehouse/production-material-handovers'
      )
    ).toBe(false)
    expect(
      getProjectedTabsFromPermissionSnapshot(
        user,
        getWarehouseTabs(translateProductionHandoverGuideLabel)
      )
    ).toEqual([])
    expect(
      getWarehouseProductionMaterialHandoversOperationGuideTabs(
        translateProductionHandoverGuideLabel
      ).map((tab) => tab.href)
    ).toEqual([path])
    expect(
      resolveActiveSidebarPath(getAccessibleNavGroups(user, groups), path)
        ?.nodeIds
    ).toEqual([
      'warehouse-logistics-handbook-group',
      'production-material-handovers-handbook',
    ])
    const shortcuts = buildHomeBusinessShortcutCategories(
      user,
      groups,
      translateProductionHandoverGuideLabel
    ).flatMap((category) => category.shortcuts)
    expect(shortcuts).toMatchObject([
      {
        title: '如何办理生产领退',
        url: path,
        description: expect.stringContaining('分批发料'),
      },
    ])
    expect(
      buildGlobalSearchNavigationItems(translateProductionHandoverGuideLabel)
    ).toContainEqual(
      expect.objectContaining({ href: path, title: '如何办理生产领退' })
    )
    expect(resolveRecentVisitLabelKey(path)).toBe(
      'warehouse.productionMaterialHandoversGuide.title'
    )
  })

  it('keeps six chapters and title visible while reading without requesting business data', () => {
    const requestBusinessData = vi.fn()
    vi.stubGlobal('fetch', requestBusinessData)
    renderProductionMaterialHandoversOperationGuide()
    const reading = screen.getByRole('region', { name: '生产领退指南正文' })
    expect(reading).not.toContainElement(
      screen.getByRole('heading', { level: 1, name: '如何办理生产领退' })
    )
    expect(reading).not.toContainElement(screen.getByRole('tablist'))
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    for (const name of [
      '分批发料',
      '补料',
      '原单退料',
      '进度与对账',
      '异常与重试',
      '办理前准备',
    ]) {
      reading.scrollTop = 200
      selectProductionMaterialHandoversOperationGuideChapter(name)
      expect(reading.scrollTop).toBe(0)
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    }
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(requestBusinessData).not.toHaveBeenCalled()
  })

  it('explains the actual allocation, supplement and original-return steps', () => {
    renderProductionMaterialHandoversOperationGuide()
    expect(
      screen.getByText(/正式单据打印及消息通知仍待接入/)
    ).toBeInTheDocument()
    selectProductionMaterialHandoversOperationGuideChapter('分批发料')
    expect(
      screen.getByRole('heading', { name: /按原单生成分配建议/ })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/零数量行不参与本次交接，分配合计必须等于本次数量/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/同一种物料跨两个批次也要逐次确认/)
    ).toBeInTheDocument()
    selectProductionMaterialHandoversOperationGuideChapter('补料')
    expect(
      screen.getByRole('heading', { name: /补料归属订单行.*必填原因/ })
    ).toBeInTheDocument()
    selectProductionMaterialHandoversOperationGuideChapter('原单退料')
    expect(
      screen.getByText(/原分配下拉同时显示订单行、批次及剩余可退量/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/不能超过所选原分配剩余可退量，原因必填/)
    ).toBeInTheDocument()
  })

  it('explains quantity examples and preserves the original request for unknown outcomes', () => {
    renderProductionMaterialHandoversOperationGuide()
    selectProductionMaterialHandoversOperationGuideChapter('进度与对账')
    expect(
      screen.getByText(/累计已领仍为 108，累计退料 3，净领料 105，超标准领料 5/)
    ).toBeInTheDocument()
    expect(screen.getByText(/不能用一行超领抵消另一行待领/)).toBeInTheDocument()
    expect(
      screen.getByText(/已有分析是快照，交接后需要重新分析/)
    ).toBeInTheDocument()
    selectProductionMaterialHandoversOperationGuideChapter('异常与重试')
    expect(
      screen.getByText(/点击“按原请求重试”，保留原数量、分配及动作/)
    ).toBeInTheDocument()
    expect(screen.getByText(/已确认领退不能直接改写或删除/)).toBeInTheDocument()
    expect(
      screen.getByText(/整页刷新或重开应用后，先查原单交接记录再继续/)
    ).toBeInTheDocument()
  })

  it('only links to business pages the reader can access', () => {
    renderProductionMaterialHandoversOperationGuide()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    cleanup()
    productionHandoverGuideReader.user.permissions.push(
      'tab_warehouse_production_material_handovers'
    )
    renderProductionMaterialHandoversOperationGuide()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: '进入生产领退办理' })
    ).toHaveAttribute('href', '/warehouse/production-material-handovers')
  })

  it('renders every chapter in English without untranslated keys', () => {
    renderProductionMaterialHandoversOperationGuide('en-US')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'How to handle production issues and returns',
      })
    ).toBeInTheDocument()
    for (const name of [
      'Before handling',
      'Issue in batches',
      'Supplement',
      'Return to original',
      'Progress and checks',
      'Problems and retries',
    ]) {
      selectProductionMaterialHandoversOperationGuideChapter(name)
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      expect(document.body.textContent).not.toContain(
        'warehouse.productionMaterialHandoversGuide.'
      )
    }
  })
})

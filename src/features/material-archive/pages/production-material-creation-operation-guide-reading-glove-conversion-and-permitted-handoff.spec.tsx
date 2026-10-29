// @vitest-environment jsdom
import type { ReactNode } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { ProductionMaterialCreationOperationGuidePage } from './production-material-creation-operation-guide-page'

const productionMaterialGuideAccount = vi.hoisted(() => ({
  user: { permissions: ['tab_materials_production_material_creation_guide'] },
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: typeof productionMaterialGuideAccount) => unknown
  ) => select(productionMaterialGuideAccount),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode
    to: string
    params?: { category: string }
  }) => (
    <a href={params ? to.replace('$category', params.category) : to}>
      {children}
    </a>
  ),
}))

beforeEach(() => {
  productionMaterialGuideAccount.user.permissions = [
    'tab_materials_production_material_creation_guide',
  ]
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderProductionMaterialCreationOperationGuide(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='production-material-creation-guide-test-language'
    >
      <ProductionMaterialCreationOperationGuidePage />
    </LanguageProvider>
  )
}

function selectProductionMaterialCreationGuideChapter(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), {
    button: 0,
    ctrlKey: false,
  })
}

describe('production material creation guide and bag-to-pair handoff', () => {
  it('allows all five chapters to be read without loading business records or opening editors', () => {
    const fetchBusinessRecords = vi.fn()
    vi.stubGlobal('fetch', fetchBusinessRecords)
    renderProductionMaterialCreationOperationGuide()
    expect(
      screen.getByText('档案对应系统内置的生产物料仓库', { selector: 'dt' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/进入“仓储作业 → 库存清单”，查看“生产物料仓库”/)
    ).toBeInTheDocument()
    const contents = screen.getByRole('tablist', {
      name: '生产物料建档指南目录',
    })
    const readingArea = screen.getByRole('region', {
      name: '生产物料建档指南正文',
    })
    expect(readingArea).not.toContainElement(contents)
    expect(readingArea).not.toContainElement(
      screen.getByRole('heading', { level: 1 })
    )
    const chapters = within(contents).getAllByRole('tab')
    expect(chapters).toHaveLength(5)
    for (const chapter of chapters.slice(1)) {
      readingArea.scrollTop = 250
      fireEvent.mouseDown(chapter, { button: 0, ctrlKey: false })
      expect(chapter).toHaveAttribute('aria-selected', 'true')
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      expect(readingArea.scrollTop).toBe(0)
    }
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(fetchBusinessRecords).not.toHaveBeenCalled()
  })

  it('explains the primary unit, automatic base unit, forward factor, and equivalent reverse factor', () => {
    renderProductionMaterialCreationOperationGuide()
    selectProductionMaterialCreationGuideChapter('填写物料档案')
    expect(
      within(screen.getByRole('table')).getByRole('row', {
        name: /计量单位 双/,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/普通手套无需为了每袋装 10 双而改为/)
    ).toBeInTheDocument()
    selectProductionMaterialCreationGuideChapter('填写拼装换算')
    const fields = screen.getByRole('table')
    expect(
      within(fields).getByRole('row', { name: /包装单位 袋/ })
    ).toBeInTheDocument()
    expect(
      within(fields).getByRole('row', { name: /系数与方向 10/ })
    ).toBeInTheDocument()
    expect(
      within(fields).getByRole('row', {
        name: /基础单位 自动带出“双”对应的单位/,
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/反向系数应为 0.1，而不是 10/)).toBeInTheDocument()
    expect(screen.getByText(/不自动串联“箱 → 袋 → 双”/)).toBeInTheDocument()
  })

  it('shows whole-bag rounding while keeping demand, purchase, delivery, and remaining stock distinct', () => {
    renderProductionMaterialCreationOperationGuide()
    selectProductionMaterialCreationGuideChapter('手套整袋示例')
    const example = screen.getByRole('table')
    for (const quantity of [
      '25 双',
      '25 ÷ 10 = 2.5 → 3 袋',
      '3 袋 × 10 = 30 双',
      '30 − 25 = 5 双',
    ]) {
      expect(within(example).getByText(quantity)).toBeInTheDocument()
    }
    expect(
      screen.getByText(/采购订单和仓库表单尚未自动读取此规则换算/)
    ).toBeInTheDocument()
    expect(screen.getByText(/不能在单位仍为“双”时只填 3/)).toBeInTheDocument()
    expect(screen.getByText(/这个建议基于总需求/)).toBeInTheDocument()
  })

  it('links only to permitted original business pages and keeps related guides independent', () => {
    productionMaterialGuideAccount.user.permissions.push(
      'tab_materials__category',
      'tab_materials_assembly',
      'tab_engineering_bom_creation_guide'
    )
    renderProductionMaterialCreationOperationGuide()
    selectProductionMaterialCreationGuideChapter('核对与下一步')
    expect(
      screen.getByRole('link', { name: '打开生产物料档案' })
    ).toHaveAttribute('href', '/materials/all')
    expect(screen.getByRole('link', { name: '打开拼装规则' })).toHaveAttribute(
      'href',
      '/materials/assembly'
    )
    expect(
      screen.getByRole('link', { name: '阅读如何建立 BOM' })
    ).toHaveAttribute('href', '/engineering/bom-creation-guide')
    expect(
      screen.queryByRole('link', { name: '打开采购订单' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: '查看生产物料仓库库存' })
    ).not.toBeInTheDocument()
  })

  it('provides the same actionable example in English', () => {
    renderProductionMaterialCreationOperationGuide('en-US')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'How to create production material records'
    )
    expect(
      screen.getByText(
        'Records correspond to the built-in Production Material Warehouse',
        { selector: 'dt' }
      )
    ).toBeInTheDocument()
    selectProductionMaterialCreationGuideChapter('Define package conversion')
    expect(
      within(screen.getByRole('table')).getByRole('row', {
        name: /Factor and direction 10/,
      })
    ).toBeInTheDocument()
    selectProductionMaterialCreationGuideChapter('Gloves by the bag')
    expect(
      within(screen.getByRole('table')).getByText('25 ÷ 10 = 2.5 → 3 bags')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/do not yet read this rule for automatic conversion/)
    ).toBeInTheDocument()
  })
})

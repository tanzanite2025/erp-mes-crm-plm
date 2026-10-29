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
import { PartRequirementsOperationGuidePage } from './part-requirements-operation-guide-page'

const partRequirementsGuideAccount = vi.hoisted(() => ({
  user: { permissions: ['tab_mrp_requirements_guide'] },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: typeof partRequirementsGuideAccount) => unknown
  ) => select(partRequirementsGuideAccount),
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
  partRequirementsGuideAccount.user.permissions = ['tab_mrp_requirements_guide']
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderPartRequirementsOperationGuide(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='part-requirements-guide-test-language'
    >
      <PartRequirementsOperationGuidePage />
    </LanguageProvider>
  )
}

function selectPartRequirementsGuideChapter(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), {
    button: 0,
    ctrlKey: false,
  })
}

describe('part requirements guide reading and domain boundaries', () => {
  it('shows one of five chapters, resets only the reading position, and performs no business requests', () => {
    const fetchBusinessData = vi.fn()
    vi.stubGlobal('fetch', fetchBusinessData)
    renderPartRequirementsOperationGuide()
    const navigation = screen.getByRole('tablist', { name: '料号需求指南目录' })
    const chapters = within(navigation).getAllByRole('tab')
    expect(chapters).toHaveLength(5)
    const readingArea = screen.getByRole('region', { name: '料号需求指南正文' })
    const header = screen.getByRole('heading', {
      level: 1,
      name: '如何分析料号需求',
    })
    expect(readingArea).not.toContainElement(header)
    expect(readingArea).not.toContainElement(navigation)
    for (const chapter of chapters) {
      readingArea.scrollTop = 300
      fireEvent.mouseDown(chapter, { button: 0, ctrlKey: false })
      expect(chapter).toHaveAttribute('aria-selected', 'true')
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      if (chapter !== chapters[0]) expect(readingArea.scrollTop).toBe(0)
    }
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchBusinessData).not.toHaveBeenCalled()
  })

  it('explains current BOM selection, full order quantities, supply integration gaps, and packaging scope', () => {
    renderPartRequirementsOperationGuide()
    expect(screen.getByText(/不扣减已完工、已发货数量/)).toBeInTheDocument()
    selectPartRequirementsGuideChapter('数据从哪里来')
    expect(screen.getByText(/不会自动取最新创建的一份/)).toBeInTheDocument()
    expect(
      screen.getByText(/研发 BOM（EBOM）、草稿和作废配方不参与/)
    ).toBeInTheDocument()
    selectPartRequirementsGuideChapter('用量如何计算')
    const example = screen.getByRole('table')
    expect(within(example).getByText('210 + 105 = 315 m²')).toBeInTheDocument()
    expect(screen.getByText(/不再加一次损耗/)).toBeInTheDocument()
    expect(screen.getByText(/不会按成品重量反推原料/)).toBeInTheDocument()
    selectPartRequirementsGuideChapter('库存与缺口')
    expect(screen.getByText(/采购在途、生产在制尚未接入/)).toBeInTheDocument()
    expect(screen.getByText(/合计缺口 60/)).toBeInTheDocument()
    expect(screen.getByText(/预计缺口 215 m²/)).toBeInTheDocument()
    selectPartRequirementsGuideChapter('核对与下一步')
    expect(
      screen.getByText(/不生成可打印、导出的完整需求汇总/)
    ).toBeInTheDocument()
    expect(screen.getByText(/建议至少 13 卷/)).toBeInTheDocument()
    expect(
      screen.getByText(/Excel 导出的是本次完整分析清单/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/总体待领逐行汇总，超领单独显示/)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: '阅读生产领料指南' })
    ).not.toBeInTheDocument()
  })

  it('keeps explanations readable with guide-only access and shows only permitted business links', () => {
    renderPartRequirementsOperationGuide()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    cleanup()
    partRequirementsGuideAccount.user.permissions.push(
      'tab_trading_sales_orders'
    )
    renderPartRequirementsOperationGuide()
    expect(screen.getByRole('link', { name: '查看销售订单' })).toHaveAttribute(
      'href',
      '/trading/sales-orders'
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
    selectPartRequirementsGuideChapter('数据从哪里来')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    selectPartRequirementsGuideChapter('用量如何计算')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('provides the same five-chapter reading experience in English', () => {
    renderPartRequirementsOperationGuide('en-US')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'How to analyze part requirements',
      })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(5)
    selectPartRequirementsGuideChapter('Inventory and gaps')
    expect(
      screen.getByText(
        /Inbound purchases and work in progress are not connected/
      )
    ).toBeInTheDocument()
    selectPartRequirementsGuideChapter('Verify and proceed')
    expect(screen.getByText(/at least 13 rolls/)).toBeInTheDocument()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  })

  it('opens material records through the existing category route', () => {
    partRequirementsGuideAccount.user.permissions.push(
      'tab_materials__category'
    )
    renderPartRequirementsOperationGuide()
    selectPartRequirementsGuideChapter('数据从哪里来')
    expect(
      screen.getByRole('link', { name: '查看生产物料档案' })
    ).toHaveAttribute('href', '/materials/all')
  })

  it('links to the issuance guide only when the reader can access that guide', () => {
    partRequirementsGuideAccount.user.permissions.push(
      'tab_mrp_production_material_issuance_guide'
    )
    renderPartRequirementsOperationGuide()
    selectPartRequirementsGuideChapter('核对与下一步')
    expect(
      screen.getByRole('link', { name: '阅读生产领料指南' })
    ).toHaveAttribute('href', '/mrp/production-material-issuance-guide')
    expect(
      screen.queryByRole('link', { name: '打开料号需求' })
    ).not.toBeInTheDocument()
  })
})

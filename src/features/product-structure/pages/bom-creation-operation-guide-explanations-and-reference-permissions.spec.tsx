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
import { BOMCreationOperationGuidePage } from './bom-creation-operation-guide-page'

const bomHandbookAccount = vi.hoisted(() => ({
  user: { id: 'bom-handbook-reader', permissions: ['menu_engineering'] },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof bomHandbookAccount) => unknown) =>
    select(bomHandbookAccount),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

beforeEach(() => {
  bomHandbookAccount.user.permissions = ['menu_engineering']
})
afterEach(cleanup)

function renderBOMCreationOperationGuideForExplanationTests(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='bom-handbook-test-language'
    >
      <BOMCreationOperationGuidePage />
    </LanguageProvider>
  )
}

describe('BOM handbook explanations without an editing workflow', () => {
  it('switches five numbered tabs with only the selected chapter visible and resets its reading position', () => {
    renderBOMCreationOperationGuideForExplanationTests()
    expect(
      screen.getByRole('heading', { level: 1, name: '如何建立 BOM' })
    ).toBeInTheDocument()
    const contents = screen.getByRole('tablist', { name: 'BOM 指南目录' })
    const tabs = within(contents).getAllByRole('tab')
    expect(tabs).toHaveLength(5)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    const readingArea = screen.getByRole('region', { name: 'BOM 指南正文' })
    const expectedSectionLabels = [
      '先认识 BOM',
      '确定具体产品与归属',
      '选择性能版本并填写重量',
      '按分组填写配方',
      '保存并管理生命周期',
    ]
    for (const [index, tab] of tabs.entries()) {
      expect(tab).toHaveAccessibleName(expectedSectionLabels[index])
      expect(tab).not.toHaveAttribute('href')
      readingArea.scrollTop = 200
      fireEvent.mouseDown(tab, { button: 0, ctrlKey: false })
      expect(tab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      expect(
        screen.getByRole('tabpanel', { name: expectedSectionLabels[index] })
      ).toHaveAttribute('id', tab.getAttribute('aria-controls'))
      if (index > 0) expect(readingArea.scrollTop).toBe(0)
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('explains version scope, finished weight, shared groups, and what saving persists', () => {
    renderBOMCreationOperationGuideForExplanationTests()
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: '确定具体产品与归属' }),
      { button: 0, ctrlKey: false }
    )
    expect(screen.getByText(/日期与生命周期状态分别管理/)).toBeInTheDocument()
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: '选择性能版本并填写重量' }),
      { button: 0, ctrlKey: false }
    )
    expect(screen.getByText('性能版本', { selector: 'dt' })).toBeInTheDocument()
    expect(
      screen.getByText('BOM 修订版本', { selector: 'dt' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('生命周期状态', { selector: 'dt' })
    ).toBeInTheDocument()
    expect(screen.getByText(/每种产品只建立自己需要的版本/)).toBeInTheDocument()
    const weightSection = screen.getByRole('region', {
      name: 'BOM 的重量代表什么',
    })
    expect(
      within(weightSection).getByText(/具体产品、性能版本在该配方下的成品重量/)
    ).toBeInTheDocument()
    expect(
      within(weightSection).getByText(/标准版填写 480 g、轻量版填写 420 g/)
    ).toBeInTheDocument()
    expect(
      within(weightSection).getByText(/保存 BOM 只保存当前选中的性能版本和重量/)
    ).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '按分组填写配方' }), {
      button: 0,
      ctrlKey: false,
    })
    const groupSection = screen.getByRole('region', {
      name: '分组配置代表什么',
    })
    expect(
      within(groupSection).getByText(/一套共用的物料分类目录/)
    ).toBeInTheDocument()
    expect(
      within(groupSection).getByText(/只改变当前 BOM 草稿/)
    ).toBeInTheDocument()
    expect(
      within(groupSection).getByText(/不代表已经安排生产顺序、生产工序或排产/)
    ).toBeInTheDocument()
    expect(screen.getByText(/标准用量为 2.1/)).toBeInTheDocument()
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: '保存并管理生命周期' }),
      { button: 0, ctrlKey: false }
    )
    expect(
      screen.getByText(/保存草稿不代表已经可以投入生产/)
    ).toBeInTheDocument()
  })

  it('keeps all explanations available for a guide-only account without exposing inaccessible pages', () => {
    bomHandbookAccount.user.permissions = ['tab_engineering_bom_creation_guide']
    renderBOMCreationOperationGuideForExplanationTests()
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: '选择性能版本并填写重量' }),
      { button: 0, ctrlKey: false }
    )
    expect(
      screen.getByRole('heading', { name: 'BOM 的重量代表什么' })
    ).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '按分组填写配方' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByRole('heading', { name: '分组配置代表什么' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: '相关页面' })
    ).not.toBeInTheDocument()
  })

  it('shows only related pages permitted by the account', () => {
    bomHandbookAccount.user.permissions = [
      'tab_engineering_bom_creation_guide',
      'tab_product_structure_section_config',
      'tab_engineering_product_creation_guide',
    ]
    renderBOMCreationOperationGuideForExplanationTests()
    const references = screen.getByRole('region', { name: '相关页面' })
    expect(within(references).getAllByRole('link')).toHaveLength(2)
    expect(
      within(references).getByRole('link', { name: '查看分组配置' })
    ).toHaveAttribute('href', '/product-structure/section-config')
    expect(
      within(references).getByRole('link', { name: '阅读如何建立产品' })
    ).toHaveAttribute('href', '/engineering/product-creation-guide')
    expect(
      screen.queryByRole('link', { name: '前往 BOM 配方' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: '查看 BOM 追溯' })
    ).not.toBeInTheDocument()
  })

  it('renders the English handbook and switches its chapter tabs', () => {
    renderBOMCreationOperationGuideForExplanationTests('en-US')
    expect(
      screen.getByRole('heading', { name: 'How to Create a BOM' })
    ).toBeInTheDocument()
    fireEvent.mouseDown(
      screen.getByRole('tab', {
        name: 'Choose a performance version and weight',
      }),
      { button: 0, ctrlKey: false }
    )
    expect(
      screen.getByRole('heading', { name: 'What does BOM weight mean?' })
    ).toBeInTheDocument()
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'Enter the recipe by group' }),
      { button: 0, ctrlKey: false }
    )
    expect(
      screen.getByRole('heading', {
        name: 'What does group configuration mean?',
      })
    ).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('tablist', { name: 'BOM guide contents' })
      ).getAllByRole('tab')
    ).toHaveLength(5)
    expect(
      screen.queryByText(/engineering\.bomCreationGuide/)
    ).not.toBeInTheDocument()
  })
})

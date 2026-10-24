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
import { ProductCreationOperationGuidePage } from './product-creation-operation-guide-page'

const handbookAccount = vi.hoisted(() => ({
  user: { id: 'handbook-reader', permissions: ['menu_engineering'] },
  isIdentitySynced: true,
  isSyncing: false,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof handbookAccount) => unknown) =>
    select(handbookAccount),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock(
  '@/features/product-structure/components/bom-creation-guide/bom-creation-guide-draft-dialog',
  () => ({
    BOMCreationGuideDraftDialog: ({ onClose }: { onClose: () => void }) => (
      <div role='dialog' aria-label='BOM 草稿录入'>
        <button onClick={onClose}>关闭 BOM 草稿</button>
      </div>
    ),
  })
)
vi.mock(
  '../components/product-creation-guide/product-creation-operation-guide-dialog',
  () => ({
    ProductCreationOperationGuideDialog: ({
      onClose,
    }: {
      onClose: () => void
    }) => (
      <div role='dialog' aria-label='产品建立向导'>
        <button onClick={onClose}>关闭向导</button>
      </div>
    ),
  })
)

beforeEach(() => {
  handbookAccount.user.permissions = ['menu_engineering']
})
afterEach(cleanup)

function renderProductCreationHandbookForManualEntryTest(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='product-handbook-test-language'
    >
      <ProductCreationOperationGuidePage />
    </LanguageProvider>
  )
}

describe('product creation handbook and deliberate wizard entry', () => {
  it('distinguishes product fields from BOM fields and opens the deliberate BOM entry from the product guide', async () => {
    handbookAccount.user.permissions = [
      'menu_engineering',
      'menu_product_structure',
      'action_engineering_bom_manage',
    ]
    renderProductCreationHandbookForManualEntryTest()
    expect(
      screen.getByRole('link', { name: '录入产品型号、规格与涂装' })
    ).toHaveAttribute('href', '/engineering/products')
    expect(
      screen.getByText(/请勿在产品规格或模板中另建同义字段/)
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: '录入归属、版本、重量与配方' })
    )
    expect(
      await screen.findByRole('dialog', { name: 'BOM 草稿录入' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭 BOM 草稿' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '资料组成' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('shows the handbook first and opens the wizard only after the user clicks its entry', async () => {
    renderProductCreationHandbookForManualEntryTest()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '一个产品包含哪些资料' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '物理规格模板 · 定义填写内容' })
    ).not.toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '配置参考' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByRole('heading', { name: '物理规格模板 · 定义填写内容' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('可上传纹理、涂装等外观参考图片，列表中显示图片缩略图。')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '开始 / 继续建档' }))
    expect(
      await screen.findByRole('dialog', { name: '产品建立向导' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭向导' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '配置参考' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    fireEvent.mouseDown(screen.getByRole('tab', { name: '资料组成' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByRole('heading', { name: '一个产品包含哪些资料' })
    ).toBeInTheDocument()
  })

  it('keeps explanations available while filtering reference page links by permission', () => {
    handbookAccount.user.permissions = [
      'tab_engineering_product_creation_guide',
    ]
    const view = renderProductCreationHandbookForManualEntryTest()
    expect(
      screen.queryByRole('link', { name: '录入产品型号、规格与涂装' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '录入归属、版本、重量与配方' })
    ).toBeDisabled()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '配置参考' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByRole('heading', { name: '产品外观 · 用图片说明效果' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /^查看/ })
    ).not.toBeInTheDocument()
    view.unmount()
    handbookAccount.user.permissions = ['tab_engineering_product_appearance']
    renderProductCreationHandbookForManualEntryTest()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '配置参考' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(screen.getByRole('link', { name: '查看产品外观' })).toHaveAttribute(
      'href',
      '/engineering/product-appearance'
    )
    expect(
      screen.queryByRole('link', { name: '查看物理规格模板' })
    ).not.toBeInTheDocument()
  })

  it('shows one of five chapters at a time and resets only the reading area when switching', () => {
    renderProductCreationHandbookForManualEntryTest()
    const contents = screen.getByRole('tablist', { name: '本页内容' })
    const tabs = within(contents).getAllByRole('tab')
    const readingArea = screen.getByRole('region', { name: '产品指南正文' })
    const handbookTitle = screen.getByRole('heading', {
      level: 1,
      name: '如何建立产品',
    })
    const expectedChapters = [
      { label: '资料组成', heading: '一个产品包含哪些资料' },
      { label: '型号与卡片', heading: '从三级分类到具体产品卡片' },
      { label: '建立步骤', heading: '产品建立与后续 BOM 绑定' },
      { label: '展示与维护', heading: '页面上的内容分别对应哪里' },
      { label: '配置参考', heading: '配置参考与维护入口' },
    ]
    expect(tabs).toHaveLength(5)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(readingArea).not.toContainElement(contents)
    expect(readingArea).not.toContainElement(handbookTitle)
    expect(readingArea).not.toContainElement(
      screen.getByRole('button', { name: '开始 / 继续建档' })
    )
    const initialHash = window.location.hash

    for (const [index, chapter] of expectedChapters.entries()) {
      readingArea.scrollTop = 200
      expect(tabs[index]).toHaveAccessibleName(chapter.label)
      expect(tabs[index]).not.toHaveAttribute('href')
      fireEvent.mouseDown(tabs[index], { button: 0, ctrlKey: false })
      expect(tabs[index]).toHaveAttribute('aria-selected', 'true')
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      expect(
        screen.getByRole('tabpanel', { name: chapter.label })
      ).toHaveAttribute('id', tabs[index].getAttribute('aria-controls'))
      expect(
        screen.getByRole('heading', { name: chapter.heading })
      ).toBeVisible()
      if (index > 0) expect(readingArea.scrollTop).toBe(0)
      expect(window.location.hash).toBe(initialHash)
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('switches the English chapter labels while keeping the guide readable without business page links', () => {
    handbookAccount.user.permissions = [
      'tab_engineering_product_creation_guide',
    ]
    renderProductCreationHandbookForManualEntryTest('en-US')
    expect(
      screen.getByRole('tablist', { name: 'On this page' })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(5)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Models and cards' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(screen.getByText('R50 (Disc brake)')).toBeVisible()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/engineering\.productCreationGuide/)
    ).not.toBeInTheDocument()
  })
})

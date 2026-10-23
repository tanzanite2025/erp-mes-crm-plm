// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { ProductCreationOperationGuidePage } from './product-creation-operation-guide-page'

const handbookAccount = vi.hoisted(() => ({
  user: { id: 'handbook-reader', permissions: ['menu_engineering'] },
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

function renderProductCreationHandbookForManualEntryTest() {
  return render(
    <LanguageProvider defaultLocale='zh-CN'>
      <ProductCreationOperationGuidePage />
    </LanguageProvider>
  )
}

describe('product creation handbook and deliberate wizard entry', () => {
  it('shows the handbook first and opens the wizard only after the user clicks its entry', async () => {
    renderProductCreationHandbookForManualEntryTest()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '一个产品包含哪些资料' })
    ).toBeInTheDocument()
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
      screen.getByRole('heading', { name: '产品外观 · 用图片说明效果' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /^查看/ })
    ).not.toBeInTheDocument()
    view.unmount()
    handbookAccount.user.permissions = ['tab_engineering_product_appearance']
    renderProductCreationHandbookForManualEntryTest()
    expect(screen.getByRole('link', { name: '查看产品外观' })).toHaveAttribute(
      'href',
      '/engineering/product-appearance'
    )
    expect(
      screen.queryByRole('link', { name: '查看物理规格模板' })
    ).not.toBeInTheDocument()
  })
})

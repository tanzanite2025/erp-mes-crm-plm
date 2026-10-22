// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { HomeBusinessShortcutCategorySection } from './home-business-shortcut-category-section'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: ReactNode
    to: string
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))
vi.mock(
  '@/features/engineering/components/product-creation-guide/product-creation-operation-guide-dialog',
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
afterEach(cleanup)

describe('HOME product creation shortcut', () => {
  it('opens the shared modal in place and keeps ordinary shortcuts as page links', async () => {
    render(
      <LanguageProvider defaultLocale='zh-CN'>
        <HomeBusinessShortcutCategorySection
          category={{
            id: 'product-management',
            title: '产品管理',
            description: '建立产品档案',
            shortcuts: [
              {
                id: 'guide',
                title: '如何建立产品',
                description: '打开分步向导',
                domainTitle: '产品',
                url: '/engineering/product-creation-guide',
              },
              {
                id: 'products',
                title: '产品档案',
                domainTitle: '产品',
                url: '/engineering/products',
              },
            ],
          }}
        />
      </LanguageProvider>
    )
    expect(screen.getByRole('link', { name: /产品档案/ })).toHaveAttribute(
      'href',
      '/engineering/products'
    )
    expect(
      screen.queryByRole('link', { name: /如何建立产品/ })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /如何建立产品/ }))
    expect(
      await screen.findByRole('dialog', { name: '产品建立向导' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭向导' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

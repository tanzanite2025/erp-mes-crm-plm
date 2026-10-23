// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { translate, type TranslationKey } from '@/locales'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { getSidebarData } from '@/components/layout/data/sidebar-data'
import { buildHomeBusinessShortcutCategories } from '../data/build-home-business-shortcut-categories'
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
  it('shows the BOM handbook beside the product guide before expanding and links directly to its explanation page', () => {
    const translateHomeShortcutLabel = (key: TranslationKey) =>
      translate('zh-CN', key)
    const categories = buildHomeBusinessShortcutCategories(
      { permissions: ['menu_engineering'] },
      getSidebarData(translateHomeShortcutLabel).navGroups,
      translateHomeShortcutLabel
    )
    const productCategory = categories.find(
      (category) => category.id === 'product-management'
    )!
    render(
      <LanguageProvider defaultLocale='zh-CN'>
        <HomeBusinessShortcutCategorySection category={productCategory} />
      </LanguageProvider>
    )

    expect(screen.getByRole('button', { name: /查看更多/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(screen.getByRole('button', { name: /如何建立产品/ })).toBeVisible()
    expect(screen.getByRole('link', { name: /如何建立 BOM/ })).toHaveAttribute(
      'href',
      '/engineering/bom-creation-guide'
    )
    expect(
      screen.getByText(
        translateHomeShortcutLabel('home.bomCreationGuideShortcutDescription')
      )
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: /如何建立 BOM/ })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

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

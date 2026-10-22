// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { createProductTemplateDraft } from '../utils/default-builders'
import { ProductTypeActionDialog } from './product-type-action-dialog'

const categoryDialogCatalogMocks = vi.hoisted(() => ({
  getProductTypes: vi.fn(),
  getTemplates: vi.fn(),
}))

vi.mock('../services/product-type-service', () => ({
  ProductTypeService: {
    getProductTypes: categoryDialogCatalogMocks.getProductTypes,
  },
}))
vi.mock('../services/product-template-service', () => ({
  productTemplateService: {
    getTemplates: categoryDialogCatalogMocks.getTemplates,
  },
}))
vi.mock('@/lib/logger', () => ({ createLogger: () => ({ error: vi.fn() }) }))

const existingLevelOneCategory = {
  id: 'existing-level-one-category',
  name: '已有唯一一级分类',
  code: 'EXISTING-L1',
  active: true,
  sortOrder: 0,
  version: 1,
}

function renderProductCategoryDialogForCatalogRecovery() {
  const onSubmit = vi.fn()
  render(
    <LanguageProvider defaultLocale='zh-CN'>
      <ProductTypeActionDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />
    </LanguageProvider>
  )
  return { onSubmit }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class ProductCategoryDialogCatalogTestResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  categoryDialogCatalogMocks.getProductTypes.mockResolvedValue([
    existingLevelOneCategory,
  ])
  categoryDialogCatalogMocks.getTemplates.mockResolvedValue([
    createProductTemplateDraft({ id: 'existing-template', name: '已有模板' }),
  ])
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('category dialog catalog read failure and recovery', () => {
  it.each(['categories', 'templates'] as const)(
    'explains a failed %s request and preserves typed values when reloading parent choices',
    async (failedRequest) => {
      const failingCatalogRequest =
        failedRequest === 'categories'
          ? categoryDialogCatalogMocks.getProductTypes
          : categoryDialogCatalogMocks.getTemplates
      failingCatalogRequest.mockRejectedValueOnce(new Error('Network failed'))
      const { onSubmit } = renderProductCategoryDialogForCatalogRecovery()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        '当前父级选项可能不完整，并不代表已有分类不存在'
      )
      fireEvent.change(screen.getByRole('textbox', { name: '分类名称' }), {
        target: { value: '新二级分类名称' },
      })
      fireEvent.change(screen.getByRole('textbox', { name: '分类编码' }), {
        target: { value: 'NEW-L2' },
      })
      fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
      await waitFor(() =>
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      )
      expect(screen.getByRole('textbox', { name: '分类名称' })).toHaveValue(
        '新二级分类名称'
      )
      expect(screen.getByRole('textbox', { name: '分类编码' })).toHaveValue(
        'NEW-L2'
      )
      fireEvent.keyDown(screen.getByRole('combobox', { name: '父级分类' }), {
        key: 'ArrowDown',
      })
      fireEvent.click(
        await screen.findByRole('option', {
          name: '一级分类 · 已有唯一一级分类',
        })
      )
      expect(
        screen.getByRole('combobox', { name: '父级分类' })
      ).toHaveTextContent('已有唯一一级分类')
      expect(
        screen.getByText(/当前父级是一级分类，将保存为二级分类/)
      ).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    }
  )

  it('explains that creating a category without a parent produces a level 1 category rather than a selectable base model', async () => {
    renderProductCategoryDialogForCatalogRecovery()
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    )
    expect(
      screen.getByText(/将保存为一级分类，用于归类，不会出现在基础型号选择框/)
    ).toBeInTheDocument()
    expect(categoryDialogCatalogMocks.getProductTypes).toHaveBeenCalledWith({
      isOptions: true,
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { translate, type TranslationKey } from '@/locales'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { buildProductCreationOperationGuideSteps } from '../../data/build-product-creation-operation-guide-steps'
import type { ProductCreationGuideProgress } from '../../data/product-creation-operation-guide-progress'
import type { Product } from '../../data/schema'
import type { ProductSubmitPayload } from '../../hooks/use-product-form'
import {
  createProductDraft,
  createProductTemplateDraft,
} from '../../utils/default-builders'
import { ProductCreationGuideBusinessOperationDialog } from './product-creation-guide-business-operation-dialog'

const businessMocks = vi.hoisted(() => ({
  getTemplates: vi.fn(),
  getProductTypes: vi.fn(),
  getProductById: vi.fn(),
  getTemplateResolution: vi.fn(),
  saveProducts: vi.fn(),
}))
vi.mock('../../services/product-template-service', () => ({
  productTemplateService: { getTemplates: businessMocks.getTemplates },
}))
vi.mock('../../services/product-type-service', () => ({
  ProductTypeService: {
    getProductTypes: businessMocks.getProductTypes,
    getTemplateResolution: businessMocks.getTemplateResolution,
  },
}))
vi.mock('../../services/product-core-service', () => ({
  ProductCoreService: { getProductById: businessMocks.getProductById },
}))
vi.mock('../../hooks/use-product-attribute-catalog-queries', () => ({
  useProductAttributeCatalogQueries: () => ({ categories: [] }),
}))
vi.mock('../../hooks/use-product-write-actions', () => ({
  useProductWriteActions: () => ({
    saveProducts: businessMocks.saveProducts,
    isSavingProducts: false,
  }),
}))
vi.mock('../../hooks/use-product-type-write-actions', () => ({
  useProductTypeWriteActions: () => ({
    saveProductType: vi.fn(),
    isSavingProductType: false,
  }),
}))
vi.mock('@/features/product-structure/hooks/use-bom-write-actions', () => ({
  useBOMWriteActions: () => ({ saveBOM: vi.fn(), isSavingBOM: false }),
}))
vi.mock('../product-type-action-dialog', () => ({
  ProductTypeActionDialog: () => null,
}))
vi.mock('@/features/product-structure/components/bom-action-dialog', () => ({
  BOMActionDialog: () => null,
}))
vi.mock('../product-action-dialog', () => ({
  ProductActionDialog: ({
    currentRow,
    onSubmit,
    onSaved,
    onOpenChange,
    wizardHeader,
  }: {
    currentRow?: Product
    onSubmit: (payload: ProductSubmitPayload) => Promise<Product[] | null>
    onSaved: (products: Product[]) => void
    onOpenChange: (open: boolean) => void
    wizardHeader: ReactNode
  }) => (
    <div>
      {wizardHeader}
      <p>{currentRow?.name}</p>
      <button
        onClick={async () => {
          const result = await onSubmit({ products: [currentRow!], currentRow })
          if (result) {
            onSaved(result)
            onOpenChange(false)
          }
        }}
      >
        保存产品表单
      </button>
    </div>
  ),
}))
vi.mock('@/lib/logger', () => ({ createLogger: () => ({ error: vi.fn() }) }))

const confirmedProgress: ProductCreationGuideProgress = {
  completedSteps: {
    template: { id: 'template-1', label: '已有模板', version: 1 },
    baseModel: { id: 'model-1', label: '已有基础型号' },
    product: { id: 'product-1', label: '已有产品' },
  },
  bomSkipped: false,
}

function renderExistingProductCreationConfiguration(
  stepKey: 'template' | 'product'
) {
  const onCompleted = vi.fn()
  const onClose = vi.fn()
  const step = buildProductCreationOperationGuideSteps(
    { permissions: ['menu_engineering'] },
    (key: TranslationKey) => translate('zh-CN', key)
  ).find((candidate) => candidate.key === stepKey)!
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider defaultLocale='zh-CN'>
        <ProductCreationGuideBusinessOperationDialog
          step={step}
          progress={confirmedProgress}
          wizardHeader={<p>当前步骤导航</p>}
          onBusyChange={vi.fn()}
          onClose={onClose}
          onCompleted={onCompleted}
        />
      </LanguageProvider>
    </QueryClientProvider>
  )
  return { onCompleted, onClose }
}

beforeEach(() => {
  vi.clearAllMocks()
  businessMocks.getTemplates.mockResolvedValue([
    createProductTemplateDraft({ id: 'template-1', name: '已有模板' }),
  ])
  businessMocks.getProductTypes.mockResolvedValue([
    {
      id: 'category-1',
      name: '一级分类',
      code: 'L1',
      active: true,
      version: 1,
    },
    {
      id: 'category-2',
      name: '二级分类',
      code: 'L2',
      parentId: 'category-1',
      active: true,
      version: 1,
    },
    {
      id: 'model-1',
      name: '基础型号',
      code: 'M1',
      parentId: 'category-2',
      templateId: 'template-1',
      active: true,
      version: 1,
    },
  ])
  const savedProduct = createProductDraft({
    id: 'product-1',
    name: '真实产品记录',
    typeId: 'model-1',
    sku: 'TEST-PRODUCT',
  })
  businessMocks.getProductById.mockResolvedValue(savedProduct)
  businessMocks.saveProducts.mockResolvedValue([savedProduct])
  businessMocks.getTemplateResolution.mockResolvedValue({
    resolvedTemplateId: 'template-1',
  })
})
afterEach(cleanup)

describe('existing configuration reuse in the product creation wizard', () => {
  it('restores the chosen template and confirms it directly without an attribute preparation step', async () => {
    const { onCompleted } =
      renderExistingProductCreationConfiguration('template')
    expect(
      await screen.findByRole('combobox', { name: '选择产品模板' })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '确认使用并继续' })
      ).toBeEnabled()
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('已有模板')
    expect(
      screen.queryByRole('button', { name: '新建产品模板' })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '确认使用并继续' }))
    await waitFor(() =>
      expect(onCompleted).toHaveBeenCalledWith({
        id: 'template-1',
        label: '已有模板',
        version: 1,
        attributeCategoryKeys: [],
      })
    )
    expect(businessMocks.getTemplates).toHaveBeenCalledWith({ fresh: true })
  })

  it('asks the template maintainer for help when no active template exists and keeps confirmation disabled', async () => {
    businessMocks.getTemplates.mockResolvedValue([])
    const { onCompleted } =
      renderExistingProductCreationConfiguration('template')
    expect(
      await screen.findByText(
        '暂无可用模板，请联系负责模板配置的人员确认后再继续。'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '确认使用并继续' })
    ).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: '新建产品模板' })
    ).not.toBeInTheDocument()
    expect(onCompleted).not.toHaveBeenCalled()
  })

  it('loads and updates the saved product record and ignores the form close event after saving', async () => {
    const { onCompleted, onClose } =
      renderExistingProductCreationConfiguration('product')
    expect(await screen.findByText('真实产品记录')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存产品表单' }))
    await waitFor(() =>
      expect(onCompleted).toHaveBeenCalledWith({
        id: 'product-1',
        label: '真实产品记录',
        code: 'TEST-PRODUCT',
      })
    )
    expect(businessMocks.getProductById).toHaveBeenCalledWith('product-1')
    expect(businessMocks.saveProducts.mock.calls[0][0][0].currentRow.id).toBe(
      'product-1'
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps the form open without completing the step when the actual save fails', async () => {
    businessMocks.saveProducts.mockRejectedValue(new Error('Save failed'))
    const { onCompleted, onClose } =
      renderExistingProductCreationConfiguration('product')
    await screen.findByText('真实产品记录')
    fireEvent.click(screen.getByRole('button', { name: '保存产品表单' }))
    await waitFor(() => expect(businessMocks.saveProducts).toHaveBeenCalled())
    expect(onCompleted).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})

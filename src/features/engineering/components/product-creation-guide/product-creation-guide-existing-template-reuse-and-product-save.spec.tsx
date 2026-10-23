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
import type { Product, ProductType } from '../../data/schema'
import type { ProductSubmitPayload } from '../../hooks/use-product-form'
import { PRODUCT_TYPES_QUERY_KEY } from '../../query-keys'
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

const templateConfirmedProgress: ProductCreationGuideProgress = {
  completedSteps: { template: confirmedProgress.completedSteps.template },
  bomSkipped: false,
}

const existingProductCategoryBranch: ProductType[] = [
  {
    id: 'category-1',
    name: '一级分类',
    code: 'L1',
    active: true,
    sortOrder: 0,
    version: 1,
  },
  {
    id: 'category-2',
    name: '二级分类',
    code: 'L2',
    parentId: 'category-1',
    active: true,
    sortOrder: 0,
    version: 1,
  },
  {
    id: 'model-1',
    name: '基础型号',
    code: 'M1',
    parentId: 'category-2',
    templateId: 'template-1',
    active: true,
    sortOrder: 0,
    version: 1,
  },
]

function renderExistingProductCreationConfiguration(
  stepKey: 'template' | 'baseModel' | 'product',
  progress = confirmedProgress
) {
  const onCompleted = vi.fn()
  const onClose = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const step = buildProductCreationOperationGuideSteps(
    { permissions: ['menu_engineering'] },
    (key: TranslationKey) => translate('zh-CN', key)
  ).find((candidate) => candidate.key === stepKey)!
  render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider defaultLocale='zh-CN'>
        <ProductCreationGuideBusinessOperationDialog
          step={step}
          progress={progress}
          wizardHeader={<p>当前步骤导航</p>}
          onBusyChange={vi.fn()}
          onClose={onClose}
          onCompleted={onCompleted}
        />
      </LanguageProvider>
    </QueryClientProvider>
  )
  return { onCompleted, onClose, queryClient }
}

beforeEach(() => {
  vi.clearAllMocks()
  businessMocks.getTemplates.mockResolvedValue([
    createProductTemplateDraft({ id: 'template-1', name: '已有模板' }),
  ])
  businessMocks.getProductTypes.mockResolvedValue(existingProductCategoryBranch)
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
  it.each([
    {
      name: 'no categories exist',
      types: [] as ProductType[],
      explanation: '当前读取的产品分类为空。',
      summary:
        '已读取：一级分类 0 个，二级分类 0 个，三级基础型号 0 个；本步可选 0 个。',
    },
    {
      name: 'only one level 1 category exists',
      types: existingProductCategoryBranch.slice(0, 1),
      explanation: '目前只有一级分类，尚无二级分类和三级基础型号。',
      summary:
        '已读取：一级分类 1 个，二级分类 0 个，三级基础型号 0 个；本步可选 0 个。',
    },
    {
      name: 'level 1 and 2 categories exist without a base model',
      types: existingProductCategoryBranch.slice(0, 2),
      explanation: '已有一级、二级分类，尚无三级基础型号。',
      summary:
        '已读取：一级分类 1 个，二级分类 1 个，三级基础型号 0 个；本步可选 0 个。',
    },
    {
      name: 'the only level 3 base model is inactive',
      types: existingProductCategoryBranch.map((type) =>
        type.id === 'model-1' ? { ...type, active: false } : type
      ),
      explanation: '1 个三级基础型号已停用，因此未列出。',
      summary:
        '已读取：一级分类 1 个，二级分类 1 个，三级基础型号 1 个；本步可选 0 个。',
    },
    {
      name: 'the only base model has no resolvable template',
      types: existingProductCategoryBranch.map((type) =>
        type.id === 'model-1' ? { ...type, templateId: undefined } : type
      ),
      explanation: '1 个已启用的三级基础型号未关联到可用模板，因此未列出。',
      summary:
        '已读取：一级分类 1 个，二级分类 1 个，三级基础型号 1 个；本步可选 0 个。',
    },
  ])(
    'explains unavailable choices when $name without advancing or writing records',
    async ({ types, explanation, summary }) => {
      businessMocks.getProductTypes.mockResolvedValue(types)
      const { onCompleted } = renderExistingProductCreationConfiguration(
        'baseModel',
        templateConfirmedProgress
      )
      expect(await screen.findByText(summary)).toBeInTheDocument()
      expect(
        screen.getByText(explanation, { exact: false })
      ).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveAccessibleDescription(
        /一级、二级分类用于归类，不会出现在此下拉列表中/
      )
      expect(
        screen.getByRole('button', { name: '确认使用并继续' })
      ).toBeDisabled()
      expect(screen.getByRole('button', { name: '重新加载' })).toBeEnabled()
      expect(onCompleted).not.toHaveBeenCalled()
      expect(businessMocks.saveProducts).not.toHaveBeenCalled()
      expect(businessMocks.getTemplateResolution).not.toHaveBeenCalled()
    }
  )

  it('explains a different template and tells the user how to return to the template step', async () => {
    businessMocks.getTemplates.mockResolvedValue([
      createProductTemplateDraft({ id: 'template-1', name: '已有模板' }),
      createProductTemplateDraft({ id: 'template-2', name: '其他模板' }),
    ])
    businessMocks.getProductTypes.mockResolvedValue(
      existingProductCategoryBranch.map((type) =>
        type.id === 'model-1' ? { ...type, templateId: 'template-2' } : type
      )
    )
    renderExistingProductCreationConfiguration(
      'baseModel',
      templateConfirmedProgress
    )
    expect(
      await screen.findByText(
        /1 个已启用的三级基础型号使用其他模板，与本次“已有模板”不同/
      )
    ).toHaveTextContent('可点击顶部“选择模板”重新选用对应模板')
    expect(
      screen.getByRole('button', { name: '确认使用并继续' })
    ).toBeDisabled()
  })

  it('explains a saved structural category without presenting it as a missing base model', async () => {
    businessMocks.getProductTypes.mockResolvedValue(
      existingProductCategoryBranch.slice(0, 1)
    )
    renderExistingProductCreationConfiguration('baseModel', {
      ...templateConfirmedProgress,
      completedSteps: {
        ...templateConfirmedProgress.completedSteps,
        baseModel: { id: 'category-1', label: '一级分类' },
      },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '当前记录是一级或二级分类，仅用于归类'
    )
    expect(screen.queryByText(/上次选择的记录已不存在/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '确认使用并继续' })
    ).toBeDisabled()
  })

  it('recognizes an inherited template and keeps an existing base model selectable', async () => {
    businessMocks.getProductTypes.mockResolvedValue(
      existingProductCategoryBranch.map((type) => ({
        ...type,
        templateId: type.id === 'category-2' ? 'template-1' : undefined,
      }))
    )
    renderExistingProductCreationConfiguration('baseModel')
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '确认使用并继续' })
      ).toBeEnabled()
    )
    expect(screen.getByRole('status')).toHaveTextContent('本步可选 1 个')
    expect(
      screen.queryByText(/未关联到可用模板，因此未列出/)
    ).not.toBeInTheDocument()
  })

  it.each(['categories', 'templates'] as const)(
    'distinguishes a failed %s request from a successfully loaded empty category tree',
    async (failedRequest) => {
      if (failedRequest === 'categories')
        businessMocks.getProductTypes.mockRejectedValue(
          new Error('Network failed')
        )
      else
        businessMocks.getTemplates.mockRejectedValue(
          new Error('Network failed')
        )
      renderExistingProductCreationConfiguration(
        'baseModel',
        templateConfirmedProgress
      )
      expect(await screen.findByRole('alert')).toHaveTextContent(
        failedRequest === 'categories'
          ? '产品分类读取失败，当前无法确认有哪些基础型号。'
          : '模板读取失败，当前无法核对哪些基础型号符合上一步的模板。'
      )
      expect(
        screen.queryByText(/当前读取的产品分类为空/)
      ).not.toBeInTheDocument()
      expect(screen.queryByText(/目前只有一级分类/)).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: '确认使用并继续' })
      ).toBeDisabled()
    }
  )

  it('reloads a single level 1 category into a completed hierarchy and lets the user select the new base model', async () => {
    businessMocks.getProductTypes.mockResolvedValue(
      existingProductCategoryBranch.slice(0, 1)
    )
    const { onCompleted } = renderExistingProductCreationConfiguration(
      'baseModel',
      templateConfirmedProgress
    )
    await screen.findByText(/目前只有一级分类/)
    businessMocks.getProductTypes.mockResolvedValue(
      existingProductCategoryBranch
    )
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('本步可选 1 个')
    )
    expect(screen.queryByText(/目前只有一级分类/)).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    fireEvent.click(
      await screen.findByRole('option', {
        name: '一级分类 / 二级分类 / 基础型号',
      })
    )
    fireEvent.click(screen.getByRole('button', { name: '确认使用并继续' }))
    await waitFor(() =>
      expect(onCompleted).toHaveBeenCalledWith({
        id: 'model-1',
        label: '一级分类 / 二级分类 / 基础型号',
      })
    )
  })

  it('explains how to return to the base model step when a saved selection disappears before product generation', async () => {
    businessMocks.getProductTypes.mockResolvedValue(
      existingProductCategoryBranch.slice(0, 1)
    )
    renderExistingProductCreationConfiguration('product')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '请点击顶部“基础型号”返回第二步'
    )
    expect(screen.queryByText('配置加载失败，请重试。')).not.toBeInTheDocument()
    expect(businessMocks.saveProducts).not.toHaveBeenCalled()
  })

  it('refreshes a remotely changed category catalog on confirmation so a removed selection can be replaced', async () => {
    const { onCompleted, queryClient } =
      renderExistingProductCreationConfiguration('baseModel')
    const confirmButton = screen.getByRole('button', {
      name: '确认使用并继续',
    })
    await waitFor(() => expect(confirmButton).toBeEnabled())
    const latestTypes = [
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
        id: 'new-model',
        name: '新增基础型号',
        code: 'NEW-MODEL',
        parentId: 'category-2',
        templateId: 'template-1',
        active: true,
        version: 1,
      },
    ]
    businessMocks.getProductTypes.mockResolvedValue(latestTypes)
    fireEvent.click(confirmButton)
    await waitFor(() =>
      expect(
        queryClient.getQueryData([...PRODUCT_TYPES_QUERY_KEY, 'options'])
      ).toEqual(latestTypes)
    )
    expect(confirmButton).toBeDisabled()
    expect(onCompleted).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    fireEvent.click(
      await screen.findByRole('option', {
        name: '一级分类 / 二级分类 / 新增基础型号',
      })
    )
    fireEvent.click(confirmButton)
    await waitFor(() =>
      expect(onCompleted).toHaveBeenCalledWith({
        id: 'new-model',
        label: '一级分类 / 二级分类 / 新增基础型号',
      })
    )
  })

  it('restores the chosen template and confirms it directly without an attribute preparation step', async () => {
    const { onCompleted } =
      renderExistingProductCreationConfiguration('template')
    expect(
      await screen.findByRole('combobox', { name: '选择物理规格模板' })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '确认使用并继续' })
      ).toBeEnabled()
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('已有模板')
    expect(
      screen.queryByRole('button', { name: '新建物理规格模板' })
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
      screen.queryByRole('button', { name: '新建物理规格模板' })
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

// @vitest-environment jsdom
import { type ReactElement, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../../data/schema'
import {
  type SaveProductTemplateAttributeLevelOneCategoryInput,
  type SaveProductTemplateAttributeLevelTwoOptionInput,
} from '../../mutation-types'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY,
} from '../../query-keys'
import { ProductTemplateAttributeClassificationManagementDialog } from './product-template-attribute-classification-management-dialog'
import {
  ProductTemplateAttributeLevelTwoOptionEditorDialog,
  type ProductTemplateAttributeLevelTwoOptionEditorDialogProps,
} from './product-template-attribute-level-two-option-editor-dialog'

const productAttributeApi = vi.hoisted(() => ({
  locale: 'zh-CN',
  getCategories: vi.fn(),
  getOptions: vi.fn(),
  saveCategory: vi.fn(),
  saveOption: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ locale: productAttributeApi.locale }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: productAttributeApi.toastSuccess,
    error: productAttributeApi.toastError,
  },
}))
vi.mock('../../services/product-attribute-category-service', () => ({
  ProductAttributeCategoryService: {
    getProductAttributeCategories: productAttributeApi.getCategories,
    saveProductAttributeCategory: productAttributeApi.saveCategory,
  },
}))
vi.mock('../../services/product-attribute-option-service', () => ({
  ProductAttributeOptionService: {
    getProductAttributeOptions: productAttributeApi.getOptions,
    saveProductAttributeOption: productAttributeApi.saveOption,
  },
}))

const productAttributeCategories: ProductTemplateAttributeLevelOneCategory[] = [
  {
    id: 'category-color',
    key: 'color',
    nameZh: '颜色',
    sortOrder: 10,
    active: true,
    version: 1,
  },
  {
    id: 'category-finish',
    key: 'surface-finish',
    nameZh: '表面处理',
    sortOrder: 20,
    active: false,
    version: 1,
  },
]
const existingProductAttributeOption: ProductTemplateAttributeLevelTwoOption = {
  id: 'option-black',
  categoryKey: 'color',
  value: 'black',
  labelZh: '黑色',
  sortOrder: 10,
  active: true,
  version: 2,
}
const queryClients: QueryClient[] = []

function renderProductAttributeBusinessDialog(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClients.push(queryClient)
  const result = render(
    <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
  )
  return { ...result, queryClient }
}

function ProductAttributeQuickCreateCaller(
  props: Omit<
    ProductTemplateAttributeLevelTwoOptionEditorDialogProps,
    'open' | 'onOpenChange'
  >
) {
  const [open, setOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState('')
  return (
    <>
      <button onClick={() => setOpen(true)}>快捷新增</button>
      <output aria-label='当前选项'>{selectedValue}</output>
      <ProductTemplateAttributeLevelTwoOptionEditorDialog
        {...props}
        open={open}
        onOpenChange={setOpen}
        onSaved={(savedOption) => {
          setSelectedValue(savedOption.value)
          props.onSaved?.(savedOption)
        }}
      />
    </>
  )
}

async function fillAndSubmitProductAttributeOption(chineseName: string) {
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
  )
  fireEvent.change(screen.getByRole('textbox', { name: '中文名称' }), {
    target: { value: chineseName },
  })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
}

describe('reusable product attribute business dialogs', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    productAttributeApi.locale = 'zh-CN'
    vi.stubGlobal(
      'ResizeObserver',
      class ProductAttributeDialogResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    productAttributeApi.getCategories.mockResolvedValue(
      productAttributeCategories
    )
    productAttributeApi.getOptions.mockResolvedValue([
      existingProductAttributeOption,
    ])
    productAttributeApi.saveCategory.mockImplementation(
      async (draft: SaveProductTemplateAttributeLevelOneCategoryInput) => ({
        ...draft,
        id: draft.id ?? 'created-category',
        version: (draft.version ?? 0) + 1,
      })
    )
    productAttributeApi.saveOption.mockImplementation(
      async (draft: SaveProductTemplateAttributeLevelTwoOptionInput) => ({
        ...draft,
        id: draft.id ?? 'created-option',
        version: (draft.version ?? 0) + 1,
      })
    )
  })

  afterEach(() => {
    cleanup()
    queryClients.splice(0).forEach((queryClient) => queryClient.clear())
    vi.unstubAllGlobals()
  })

  it('creates a category with an automatic internal key and validates only business fields', async () => {
    renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeClassificationManagementDialog
        open
        onOpenChange={vi.fn()}
      />
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '新增一级属性分类' })
    )
    const categoryDialog = screen.getByRole('dialog', {
      name: '新增一级属性分类',
    })
    expect(within(categoryDialog).getAllByRole('textbox')).toHaveLength(3)
    expect(
      within(categoryDialog).queryByRole('textbox', { name: /分类编码|key/i })
    ).not.toBeInTheDocument()
    expect(
      within(categoryDialog).queryByText(/分类 key|internal anchor/)
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: '中文名称' }), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(productAttributeApi.saveCategory).not.toHaveBeenCalled()
    expect(productAttributeApi.toastError).toHaveBeenCalledWith(
      '请填写中文名称'
    )

    fireEvent.change(screen.getByRole('textbox', { name: '中文名称' }), {
      target: { value: ' 材质 ' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: '英文名称' }), {
      target: { value: ' Material ' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: '说明' }), {
      target: { value: ' 产品材质分类 ' },
    })
    fireEvent.click(screen.getByRole('switch', { name: '启用状态' }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '新增一级属性分类' })
      ).not.toBeInTheDocument()
    )
    expect(productAttributeApi.saveCategory).toHaveBeenCalledWith(
      {
        key: expect.stringMatching(/^category-[a-f0-9]{32}$/),
        nameZh: '材质',
        nameEn: 'Material',
        description: '产品材质分类',
        sortOrder: 0,
        active: false,
      },
      undefined
    )
    expect(
      productAttributeApi.saveCategory.mock.calls[0][0].key.length
    ).toBeLessThanOrEqual(50)
    expect(
      screen.queryByRole('columnheader', { name: '内部编码' })
    ).not.toBeInTheDocument()
  })

  it('retains the generated category key on retry and generates another for a new draft', async () => {
    productAttributeApi.saveCategory.mockRejectedValueOnce(
      new Error('保存失败，请重试')
    )
    renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeClassificationManagementDialog
        open
        onOpenChange={vi.fn()}
      />
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '新增一级属性分类' })
    )
    fireEvent.change(screen.getByRole('textbox', { name: '中文名称' }), {
      target: { value: '材质' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(productAttributeApi.toastError).toHaveBeenCalledWith(
        '保存失败，请重试'
      )
    )
    const firstCategoryKey =
      productAttributeApi.saveCategory.mock.calls[0][0].key
    expect(screen.getByRole('textbox', { name: '中文名称' })).toHaveValue(
      '材质'
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '新增一级属性分类' })
      ).not.toBeInTheDocument()
    )
    expect(productAttributeApi.saveCategory.mock.calls[1][0].key).toBe(
      firstCategoryKey
    )

    fireEvent.click(screen.getByRole('button', { name: '新增一级属性分类' }))
    expect(screen.getByRole('textbox', { name: '中文名称' })).toHaveValue('')
    fireEvent.change(screen.getByRole('textbox', { name: '中文名称' }), {
      target: { value: '用途' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(productAttributeApi.saveCategory).toHaveBeenCalledTimes(3)
    )
    expect(productAttributeApi.saveCategory.mock.calls[2][0].key).toMatch(
      /^category-[a-f0-9]{32}$/
    )
    expect(productAttributeApi.saveCategory.mock.calls[2][0].key).not.toBe(
      firstCategoryKey
    )
  })

  it('preserves the original legacy category key and version when editing after a background refresh', async () => {
    productAttributeApi.locale = 'en-US'
    const legacyCategory = {
      ...productAttributeCategories[0],
      key: 'techSeries',
      nameZh: '工艺系列',
      nameEn: 'Technical Series',
    }
    productAttributeApi.getCategories.mockResolvedValue([legacyCategory])
    const { queryClient } = renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeClassificationManagementDialog
        open
        onOpenChange={vi.fn()}
      />
    )
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Edit Level 1 Attribute Category · Technical Series',
      })
    )
    expect(
      screen.getByRole('dialog', { name: 'Edit Level 1 Attribute Category' })
    ).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Chinese name' }), {
      target: { value: ' 新工艺系列 ' },
    })
    act(() => {
      queryClient.setQueryData(
        PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
        [{ ...legacyCategory, nameZh: '其他用户已修改', version: 5 }]
      )
    })
    expect(screen.getByRole('textbox', { name: 'Chinese name' })).toHaveValue(
      ' 新工艺系列 '
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(productAttributeApi.saveCategory).toHaveBeenCalledOnce()
    )
    expect(productAttributeApi.saveCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: legacyCategory.id,
        key: 'techSeries',
        nameZh: '新工艺系列',
        version: legacyCategory.version,
      }),
      legacyCategory
    )
  })

  it('loads on demand and returns the saved option for the caller to select', async () => {
    const onSaved = vi.fn()
    const { queryClient } = renderProductAttributeBusinessDialog(
      <ProductAttributeQuickCreateCaller
        categoryKey='color'
        onSaved={onSaved}
      />
    )
    expect(productAttributeApi.getCategories).not.toHaveBeenCalled()
    queryClient.setQueryData(PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY, [])
    queryClient.setQueryData(PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY, [])
    fireEvent.click(screen.getByRole('button', { name: '快捷新增' }))
    await fillAndSubmitProductAttributeOption(' 深海蓝 ')
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    const savedOption = onSaved.mock
      .calls[0][0] as ProductTemplateAttributeLevelTwoOption
    expect(savedOption).toMatchObject({
      id: 'created-option',
      categoryKey: 'color',
      labelZh: '深海蓝',
      active: true,
    })
    expect(savedOption.value).toMatch(/^option-[a-f0-9]{32}$/)
    expect(screen.getByLabelText('当前选项')).toHaveTextContent(
      savedOption.value
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(productAttributeApi.getOptions).not.toHaveBeenCalled()
    expect(
      queryClient.getQueryState(PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY)
        ?.isInvalidated
    ).toBe(true)
    expect(
      queryClient.getQueryState(PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY)
        ?.isInvalidated
    ).toBe(true)
  })

  it('keeps the draft and generated value for retries and resets them when reopened', async () => {
    productAttributeApi.saveOption.mockRejectedValueOnce(
      new Error('保存失败，请重试')
    )
    renderProductAttributeBusinessDialog(
      <ProductAttributeQuickCreateCaller categoryKey='color' />
    )
    fireEvent.click(screen.getByRole('button', { name: '快捷新增' }))
    await fillAndSubmitProductAttributeOption('海蓝')
    await waitFor(() =>
      expect(productAttributeApi.toastError).toHaveBeenCalledWith(
        '保存失败，请重试'
      )
    )
    const firstValue = productAttributeApi.saveOption.mock.calls[0][0].value
    expect(screen.getByRole('textbox', { name: '中文名称' })).toHaveValue(
      '海蓝'
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(productAttributeApi.saveOption.mock.calls[1][0].value).toBe(
      firstValue
    )
    fireEvent.click(screen.getByRole('button', { name: '快捷新增' }))
    expect(screen.getByRole('textbox', { name: '中文名称' })).toHaveValue('')
    await fillAndSubmitProductAttributeOption('浅灰')
    await waitFor(() =>
      expect(productAttributeApi.saveOption).toHaveBeenCalledTimes(3)
    )
    expect(productAttributeApi.saveOption.mock.calls[2][0].value).not.toBe(
      firstValue
    )
  })

  it('waits for shared option refresh before notifying the caller', async () => {
    let resolveOptionRefresh: (
      options: ProductTemplateAttributeLevelTwoOption[]
    ) => void = () => undefined
    const onSaved = vi.fn()
    const { queryClient } = renderProductAttributeBusinessDialog(
      <ProductAttributeQuickCreateCaller
        categoryKey='color'
        onSaved={onSaved}
      />
    )
    await queryClient.fetchQuery({
      queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      queryFn: () => Promise.resolve([existingProductAttributeOption]),
    })
    const { QueryObserver } = await import('@tanstack/react-query')
    const observer = new QueryObserver(queryClient, {
      queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      queryFn: () =>
        new Promise<ProductTemplateAttributeLevelTwoOption[]>((resolve) => {
          resolveOptionRefresh = resolve
        }),
      staleTime: Infinity,
    })
    const unsubscribe = observer.subscribe(() => undefined)
    fireEvent.click(screen.getByRole('button', { name: '快捷新增' }))
    await fillAndSubmitProductAttributeOption('深灰')
    await screen.findByRole('button', { name: '保存中…' })
    expect(onSaved).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => {
      resolveOptionRefresh([existingProductAttributeOption])
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    unsubscribe()
  })

  it('preserves existing identifiers and resolves legacy category spellings', async () => {
    const onSaved = vi.fn()
    const onOpenChange = vi.fn()
    const option = { ...existingProductAttributeOption, categoryKey: 'COLOR' }
    renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeLevelTwoOptionEditorDialog
        open
        option={option}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
      />
    )
    await fillAndSubmitProductAttributeOption('曜石黑')
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(productAttributeApi.saveOption).toHaveBeenCalledWith(
      expect.objectContaining({
        id: option.id,
        value: 'black',
        categoryKey: 'color',
        version: 2,
        labelZh: '曜石黑',
      }),
      option
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('refreshes an in-flight caller catalog after saving instead of accepting its older snapshot', async () => {
    const onSaved = vi.fn()
    const { queryClient } = renderProductAttributeBusinessDialog(
      <ProductAttributeQuickCreateCaller
        categoryKey='color'
        onSaved={onSaved}
      />
    )
    const { QueryObserver } = await import('@tanstack/react-query')
    let resolveOldSnapshot: (
      options: ProductTemplateAttributeLevelTwoOption[]
    ) => void = () => undefined
    const loadCallerOptions = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ProductTemplateAttributeLevelTwoOption[]>((resolve) => {
            resolveOldSnapshot = resolve
          })
      )
      .mockImplementation(async () => [
        existingProductAttributeOption,
        {
          ...productAttributeApi.saveOption.mock.calls[0][0],
          id: 'created-option',
          version: 1,
        },
      ])
    const observer = new QueryObserver(queryClient, {
      queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      queryFn: loadCallerOptions,
    })
    const unsubscribe = observer.subscribe(() => undefined)
    try {
      fireEvent.click(screen.getByRole('button', { name: '快捷新增' }))
      await fillAndSubmitProductAttributeOption('保存后的新颜色')
      await waitFor(() =>
        expect(productAttributeApi.saveOption).toHaveBeenCalledOnce()
      )
      await act(async () => {
        resolveOldSnapshot([existingProductAttributeOption])
      })
      await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
      expect(
        queryClient.getQueryData<ProductTemplateAttributeLevelTwoOption[]>(
          PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY
        )
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ labelZh: '保存后的新颜色' }),
        ])
      )
    } finally {
      unsubscribe()
    }
  })

  it('retains the original creation category and draft when the selected category disappears in a background refresh', async () => {
    const { queryClient } = renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeClassificationManagementDialog
        open
        onOpenChange={vi.fn()}
      />
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '新增二级属性分类' })
    )
    fireEvent.change(await screen.findByRole('textbox', { name: '中文名称' }), {
      target: { value: '不能迁移到另一分类的草稿' },
    })
    productAttributeApi.getCategories.mockResolvedValue([
      productAttributeCategories[1],
    ])
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
      })
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    )
    expect(screen.getByRole('textbox', { name: '中文名称' })).toHaveValue(
      '不能迁移到另一分类的草稿'
    )
    expect(productAttributeApi.saveOption).not.toHaveBeenCalled()
  })

  it('retains the original edit version when the caller receives a newer option during editing', async () => {
    const onOpenChange = vi.fn()
    const { queryClient, rerender } = renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeLevelTwoOptionEditorDialog
        open
        option={existingProductAttributeOption}
        onOpenChange={onOpenChange}
      />
    )
    const nameInput = await screen.findByRole('textbox', { name: '中文名称' })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    )
    fireEvent.change(nameInput, { target: { value: '本地编辑草稿' } })
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductTemplateAttributeLevelTwoOptionEditorDialog
          open
          option={{
            ...existingProductAttributeOption,
            version: 3,
            labelZh: '另一位用户的新名称',
          }}
          onOpenChange={onOpenChange}
        />
      </QueryClientProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(productAttributeApi.saveOption).toHaveBeenCalledOnce()
    )
    expect(productAttributeApi.saveOption).toHaveBeenCalledWith(
      expect.objectContaining({ labelZh: '本地编辑草稿', version: 2 }),
      existingProductAttributeOption
    )
  })

  it('keeps the initially displayed default category if it disappears while a standalone draft is open', async () => {
    const { queryClient } = renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeLevelTwoOptionEditorDialog
        open
        onOpenChange={vi.fn()}
      />
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    )
    fireEvent.change(screen.getByRole('textbox', { name: '中文名称' }), {
      target: { value: '保留默认分类的草稿' },
    })
    await act(async () => {
      queryClient.setQueryData(
        PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
        [productAttributeCategories[1]]
      )
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    )
    expect(screen.getByRole('textbox', { name: '中文名称' })).toHaveValue(
      '保留默认分类的草稿'
    )
    expect(productAttributeApi.saveOption).not.toHaveBeenCalled()
  })

  it('blocks unknown categories and can retry a failed category request', async () => {
    productAttributeApi.getCategories.mockRejectedValueOnce(
      new Error('加载失败')
    )
    renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeLevelTwoOptionEditorDialog
        open
        categoryKey='missing-category'
        onOpenChange={vi.fn()}
      />
    )
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    await screen.findByText(
      '当前一级属性分类不存在，请关闭后重新选择一级属性分类。'
    )
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    expect(productAttributeApi.saveOption).not.toHaveBeenCalled()
  })

  it('retains an open draft across a failed background refresh and completes a successful save', async () => {
    const onSaved = vi.fn()
    const { queryClient } = renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeClassificationManagementDialog
        open
        onOpenChange={vi.fn()}
        onLevelTwoOptionSaved={onSaved}
      />
    )
    await screen.findByRole('button', { name: '新增二级属性分类' })
    fireEvent.click(screen.getByRole('button', { name: '新增二级属性分类' }))
    const nameInput = await screen.findByRole('textbox', { name: '中文名称' })
    fireEvent.change(nameInput, { target: { value: '网络波动时的草稿' } })
    productAttributeApi.getOptions.mockRejectedValue(new Error('目录刷新失败'))
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY,
      })
    })
    expect(screen.getByRole('textbox', { name: '中文名称' })).toHaveValue(
      '网络波动时的草稿'
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(productAttributeApi.saveOption).toHaveBeenCalledOnce()
    expect(productAttributeApi.toastError).not.toHaveBeenCalled()
    expect(
      screen.getByRole('dialog', { name: '产品模板属性分类管理' })
    ).toBeInTheDocument()
    expect(
      queryClient.getQueryData<ProductTemplateAttributeLevelTwoOption[]>(
        PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ labelZh: '网络波动时的草稿' }),
      ])
    )
  })

  it('keeps inactive saved options in the complete catalog and out of active-only caller data', async () => {
    const { queryClient } = renderProductAttributeBusinessDialog(
      <ProductAttributeQuickCreateCaller categoryKey='color' />
    )
    queryClient.setQueryData(PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY, [
      existingProductAttributeOption,
    ])
    queryClient.setQueryData(PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY, [
      existingProductAttributeOption,
    ])
    fireEvent.click(screen.getByRole('button', { name: '快捷新增' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    )
    fireEvent.click(screen.getByRole('switch'))
    await fillAndSubmitProductAttributeOption('停用的海蓝')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(
      queryClient.getQueryData<ProductTemplateAttributeLevelTwoOption[]>(
        PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY
      )
    ).toEqual([existingProductAttributeOption])
    expect(
      queryClient.getQueryData<ProductTemplateAttributeLevelTwoOption[]>(
        PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ labelZh: '停用的海蓝', active: false }),
      ])
    )
  })

  it('loads the complete management catalog independently of cached active-only data', async () => {
    const onOpenChange = vi.fn()
    const { queryClient, rerender } = renderProductAttributeBusinessDialog(
      <ProductTemplateAttributeClassificationManagementDialog
        open={false}
        onOpenChange={onOpenChange}
        initialLevelOneCategoryKey='SURFACE_FINISH'
      />
    )
    expect(productAttributeApi.getCategories).not.toHaveBeenCalled()
    queryClient.setQueryData(PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY, [
      productAttributeCategories[0],
    ])
    queryClient.setQueryData(PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY, [])
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductTemplateAttributeClassificationManagementDialog
          open
          onOpenChange={onOpenChange}
          initialLevelOneCategoryKey='SURFACE_FINISH'
        />
      </QueryClientProvider>
    )
    await screen.findByText('所属一级属性分类 · 表面处理')
    expect(
      screen.getByRole('button', { name: /表面处理\s*二级属性分类数量: 0/ })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      queryClient.getQueryData(PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY)
    ).toEqual(productAttributeCategories)
    expect(productAttributeApi.getCategories).toHaveBeenCalledWith()
    expect(productAttributeApi.getOptions).toHaveBeenCalledWith()
    expect(
      queryClient.getQueryData(PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY)
    ).toEqual([productAttributeCategories[0]])
    fireEvent.click(screen.getByRole('button', { name: '新增二级属性分类' }))
    const dialogs = screen.getAllByRole('dialog', { hidden: true })
    expect(dialogs).toHaveLength(2)
    await waitFor(() =>
      expect(
        within(dialogs[1]).getByRole('combobox', { name: '所属一级属性分类' })
      ).toBeDisabled()
    )
    fireEvent.click(within(dialogs[1]).getByRole('button', { name: '取消' }))
    expect(screen.getByText('所属一级属性分类 · 表面处理')).toBeVisible()
  })
})

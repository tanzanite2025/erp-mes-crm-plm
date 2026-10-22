// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { translate } from '@/locales'
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
import { type DeltaPayload } from '@/lib/delta/types'
import { type ProductTemplate } from '../../data/schema'
import { DEFAULT_PRODUCT_TEMPLATES } from '../../data/template-defaults'
import { type SaveProductTemplateAttributeLevelTwoOptionInput } from '../../mutation-types'
import {
  PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
  PRODUCT_TEMPLATES_QUERY_KEY,
} from '../../query-keys'
import { productTemplateService } from '../../services/product-template-service'
import { TemplateMgmt } from '../../tabs/template-mgmt'

const templateEditorApi = vi.hoisted(() => ({
  save: vi.fn(),
  loadTemplates: vi.fn(),
  loadOptions: vi.fn(),
  loadCategories: vi.fn(),
  saveCategory: vi.fn(),
  saveOption: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (
      key: Parameters<typeof translate>[1],
      params?: Record<string, string | number>
    ) => translate('zh-CN', key, params),
  }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'template-editor-test-token' }),
  },
}))
vi.mock('sonner', () => ({
  toast: {
    success: templateEditorApi.toastSuccess,
    error: templateEditorApi.toastError,
  },
}))

const existingTemplate: ProductTemplate = {
  id: 'template-rim',
  name: '工程车圈模板',
  code: 'RIM_CUSTOM',
  componentKey: 'RIM',
  description: '原说明',
  active: true,
  createdAt: '2026-10-21T00:00:00Z',
  version: 3,
  attributeBindings: [
    {
      categoryKey: 'TECH_SERIES',
      sortOrder: 1,
      required: false,
      active: true,
      version: 1,
    },
  ],
}
const levelOneCategories = [
  {
    id: 'material-category',
    key: 'tech-series',
    nameZh: '材质',
    sortOrder: 1,
    active: true,
    version: 1,
  },
  {
    id: 'color-category',
    key: 'color',
    nameZh: '颜色',
    sortOrder: 2,
    active: true,
    version: 1,
  },
]
const levelTwoOptions = [
  {
    id: 'carbon-option',
    categoryKey: 'tech-series',
    value: 'carbon',
    labelZh: '碳纤维',
    sortOrder: 1,
    active: true,
    version: 1,
  },
  {
    id: 'alloy-option',
    categoryKey: 'TECH_SERIES',
    value: 'alloy',
    labelZh: '铝合金',
    sortOrder: 2,
    active: true,
    version: 1,
  },
  {
    id: 'inactive-option',
    categoryKey: 'tech-series',
    value: 'old',
    labelZh: '已停用材质',
    sortOrder: 3,
    active: false,
    version: 1,
  },
  {
    id: 'black-option',
    categoryKey: 'color',
    value: 'black',
    labelZh: '黑色',
    sortOrder: 1,
    active: true,
    version: 1,
  },
]
const queryClients: QueryClient[] = []

function renderProductTemplateManagementForEditorVerification() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClients.push(queryClient)
  render(
    <QueryClientProvider client={queryClient}>
      <TemplateMgmt />
    </QueryClientProvider>
  )
  return queryClient
}

describe('product template attribute assembly editor data flow', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    templateEditorApi.loadTemplates.mockResolvedValue([existingTemplate])
    templateEditorApi.loadCategories.mockResolvedValue(levelOneCategories)
    vi.stubGlobal(
      'ResizeObserver',
      class ProductTemplateEditorResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    templateEditorApi.loadOptions.mockResolvedValue(
      Response.json(levelTwoOptions)
    )
    templateEditorApi.save.mockImplementation(
      async (payload: ProductTemplate) =>
        Response.json({
          ...payload,
          id: payload.id || 'created-template',
          version: payload.version + 1,
        })
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const pathname = new URL(String(input), 'http://localhost').pathname
        if (pathname.endsWith('/engineering/templates')) {
          if (init?.method === 'POST')
            return templateEditorApi.save(JSON.parse(String(init.body)))
          return Response.json(await templateEditorApi.loadTemplates())
        }
        if (pathname.endsWith('/engineering/product-attribute-categories')) {
          if (init?.method === 'POST')
            return templateEditorApi.saveCategory(JSON.parse(String(init.body)))
          return Response.json(await templateEditorApi.loadCategories())
        }
        if (pathname.endsWith('/engineering/product-attribute-options')) {
          if (init?.method === 'POST')
            return templateEditorApi.saveOption(JSON.parse(String(init.body)))
          const response = await templateEditorApi.loadOptions()
          return response.clone()
        }
        throw new Error(`Unexpected template editor request: ${pathname}`)
      })
    )
    await productTemplateService.getTemplates({ fresh: true })
  })

  afterEach(() => {
    cleanup()
    queryClients.splice(0).forEach((queryClient) => queryClient.clear())
    vi.unstubAllGlobals()
  })

  it('shows active child options and preserves hidden fields and the original version in the actual HTTP save', async () => {
    const queryClient = renderProductTemplateManagementForEditorVerification()
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑产品模板 · 工程车圈模板' })
    )
    await screen.findByText('二级属性分类 · 2 项已启用')
    const dialog = screen.getByRole('dialog', { name: '编辑产品模板' })
    expect(within(dialog).getAllByRole('textbox')).toHaveLength(2)
    expect(
      within(dialog).queryByRole('textbox', { name: '唯一编码' })
    ).not.toBeInTheDocument()
    expect(within(dialog).queryByText('RIM_CUSTOM')).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole('combobox', { name: '产品规格表单' })
    ).not.toBeInTheDocument()
    expect(
      within(dialog).getByRole('article', { name: '材质' })
    ).toHaveTextContent('碳纤维')
    expect(
      within(dialog).getByRole('article', { name: '材质' })
    ).toHaveTextContent('铝合金')
    expect(within(dialog).queryByText('已停用材质')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('黑色')).not.toBeInTheDocument()
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '模板名称' }),
      { target: { value: ' 新车圈模板 ' } }
    )
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '必填' }))
    act(() =>
      queryClient.setQueryData(PRODUCT_TEMPLATES_QUERY_KEY, [
        {
          ...existingTemplate,
          version: 9,
          code: 'OTHER_CODE',
          componentKey: 'GENERAL',
        },
      ])
    )
    fireEvent.click(within(dialog).getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.save).toHaveBeenCalledOnce())
    expect(templateEditorApi.save.mock.calls[0][0]).toMatchObject({
      id: existingTemplate.id,
      name: '新车圈模板',
      code: 'RIM_CUSTOM',
      componentKey: 'RIM',
      version: 3,
      attributeBindings: [
        expect.objectContaining({ categoryKey: 'TECH_SERIES', required: true }),
      ],
    })
    expect(templateEditorApi.save.mock.calls[0][0]).not.toHaveProperty(
      'attributeOptions'
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })

  it('generates one code per creation draft, retains it on failure and blocks duplicate pending saves and closing', async () => {
    templateEditorApi.save.mockResolvedValueOnce(
      Response.json({ error: '模拟保存失败' }, { status: 500 })
    )
    renderProductTemplateManagementForEditorVerification()
    fireEvent.click(await screen.findByRole('button', { name: '新建模板' }))
    fireEvent.change(screen.getByRole('textbox', { name: '模板名称' }), {
      target: { value: '通用属性模板' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.toastError).toHaveBeenCalled())
    const firstDraft = templateEditorApi.save.mock.calls[0][0]
    expect(firstDraft.code).toMatch(/^TEMPLATE_[A-F0-9]{32}$/)
    expect(firstDraft.componentKey).toBe('GENERAL')
    let completeSave: (response: Response) => void = () => undefined
    templateEditorApi.save.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          completeSave = resolve
        })
    )
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))
    await screen.findByRole('button', { name: '保存中…' })
    expect(screen.getByRole('textbox', { name: '模板名称' })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: '保存中…' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(templateEditorApi.save).toHaveBeenCalledTimes(2)
    expect(templateEditorApi.save.mock.calls[1][0].code).toBe(firstDraft.code)
    await act(async () =>
      completeSave(
        Response.json({ ...firstDraft, id: 'created-template', version: 1 })
      )
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: '新建模板' }))
    fireEvent.change(screen.getByRole('textbox', { name: '模板名称' }), {
      target: { value: '第二套模板' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.save).toHaveBeenCalledTimes(3))
    expect(templateEditorApi.save.mock.calls[2][0].code).not.toBe(
      firstDraft.code
    )
  })

  it('retains an edited preset template name and cleared description after saving and reopening', async () => {
    const presetTemplate = {
      ...DEFAULT_PRODUCT_TEMPLATES[0],
      attributeBindings: existingTemplate.attributeBindings,
    }
    templateEditorApi.loadTemplates.mockResolvedValue([presetTemplate])
    await productTemplateService.getTemplates({ fresh: true })
    templateEditorApi.save.mockImplementationOnce(
      async (payload: ProductTemplate) => {
        const savedTemplate = { ...payload, version: payload.version + 1 }
        templateEditorApi.loadTemplates.mockResolvedValue([savedTemplate])
        return Response.json(savedTemplate)
      }
    )

    renderProductTemplateManagementForEditorVerification()
    fireEvent.click(
      await screen.findByRole('button', {
        name: '编辑产品模板 · 车圈物理规格模板',
      })
    )
    fireEvent.change(screen.getByRole('textbox', { name: '模板名称' }), {
      target: { value: '公路车圈属性模板' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: '说明' }), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(templateEditorApi.save.mock.calls[0][0]).toMatchObject({
      name: '公路车圈属性模板',
      description: '',
      code: 'RIM_STD',
      componentKey: 'RIM',
      version: 1,
    })
    fireEvent.click(
      await screen.findByRole('button', {
        name: '编辑产品模板 · 公路车圈属性模板',
      })
    )
    expect(screen.getByRole('textbox', { name: '模板名称' })).toHaveValue(
      '公路车圈属性模板'
    )
    expect(screen.getByRole('textbox', { name: '说明' })).toHaveValue('')
  })

  it('shows catalog failures without reporting a false empty option count and retains the draft on retry', async () => {
    templateEditorApi.loadOptions.mockResolvedValue(
      Response.json({ error: '选项加载失败' }, { status: 500 })
    )
    renderProductTemplateManagementForEditorVerification()
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑产品模板 · 工程车圈模板' })
    )
    await screen.findByRole('alert')
    expect(
      screen.getByRole('combobox', { name: '一级属性分类' })
    ).toBeDisabled()
    expect(
      screen.queryByText('二级属性分类 · 0 项已启用')
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: '模板名称' }), {
      target: { value: '未提交的模板草稿' },
    })
    templateEditorApi.loadOptions.mockResolvedValue(
      Response.json(levelTwoOptions)
    )
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    await screen.findByText('二级属性分类 · 2 项已启用')
    expect(screen.getByRole('textbox', { name: '模板名称' })).toHaveValue(
      '未提交的模板草稿'
    )
    expect(templateEditorApi.save).not.toHaveBeenCalled()
  })

  it('edits an option inline and refreshes the preview while preserving the template draft and original binding version', async () => {
    templateEditorApi.saveOption.mockImplementationOnce(
      async (payload: DeltaPayload) => {
        const savedOption = {
          ...levelTwoOptions[0],
          labelZh: payload.delta.labelZh.n,
          version: 2,
        }
        templateEditorApi.loadOptions.mockResolvedValue(
          Response.json([savedOption, ...levelTwoOptions.slice(1)])
        )
        return Response.json(savedOption)
      }
    )
    renderProductTemplateManagementForEditorVerification()
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑产品模板 · 工程车圈模板' })
    )
    await screen.findByText('二级属性分类 · 2 项已启用')
    fireEvent.change(screen.getByRole('textbox', { name: '模板名称' }), {
      target: { value: '尚未保存的模板名称' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: '说明' }), {
      target: { value: '尚未保存的说明' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: '必填' }))
    fireEvent.click(
      screen.getByRole('button', { name: '编辑二级属性选项 · 碳纤维' })
    )
    const optionDialog = screen.getByRole('dialog', {
      name: '编辑二级属性分类',
    })
    expect(
      within(optionDialog).getByRole('textbox', { name: '中文名称' })
    ).toHaveValue('碳纤维')
    expect(
      within(optionDialog).getByRole('combobox', { name: '所属一级属性分类' })
    ).toBeDisabled()
    fireEvent.change(
      within(optionDialog).getByRole('textbox', { name: '中文名称' }),
      {
        target: { value: '高模碳纤维' },
      }
    )
    fireEvent.click(within(optionDialog).getByRole('button', { name: '保存' }))
    await screen.findByRole('button', { name: '编辑二级属性选项 · 高模碳纤维' })
    expect(templateEditorApi.saveOption).toHaveBeenCalledWith({
      op: 'PATCH',
      delta: { labelZh: { o: '碳纤维', n: '高模碳纤维' } },
      metadata: expect.objectContaining({ id: 'carbon-option', version: 1 }),
    })
    expect(templateEditorApi.save).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: '模板名称' })).toHaveValue(
      '尚未保存的模板名称'
    )
    expect(screen.getByRole('textbox', { name: '说明' })).toHaveValue(
      '尚未保存的说明'
    )
    expect(screen.getByRole('checkbox', { name: '必填' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.save).toHaveBeenCalledOnce())
    expect(templateEditorApi.save.mock.calls[0][0]).toMatchObject({
      name: '尚未保存的模板名称',
      description: '尚未保存的说明',
      version: 3,
      attributeBindings: [
        expect.objectContaining({ categoryKey: 'TECH_SERIES', required: true }),
      ],
    })
  })

  it('creates options in the bound category, blocks pending closing, and removes newly deactivated options from the preview', async () => {
    let completeOptionSave: (response: Response) => void = () => undefined
    templateEditorApi.saveOption.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          completeOptionSave = resolve
        })
    )
    renderProductTemplateManagementForEditorVerification()
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑产品模板 · 工程车圈模板' })
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '新增二级属性选项' })
    )
    const optionDialog = screen.getByRole('dialog', {
      name: '新增二级属性分类',
    })
    await waitFor(() =>
      expect(
        within(optionDialog).getByRole('button', { name: '保存' })
      ).toBeEnabled()
    )
    expect(
      within(optionDialog).getByRole('combobox', { name: '所属一级属性分类' })
    ).toHaveTextContent('材质')
    expect(
      within(optionDialog).getByRole('combobox', { name: '所属一级属性分类' })
    ).toBeDisabled()
    fireEvent.change(
      within(optionDialog).getByRole('textbox', { name: '中文名称' }),
      {
        target: { value: '钛合金' },
      }
    )
    fireEvent.click(within(optionDialog).getByRole('button', { name: '保存' }))
    await screen.findByRole('button', { name: '保存中…' })
    fireEvent.keyDown(optionDialog, { key: 'Escape' })
    fireEvent.click(within(optionDialog).getByRole('button', { name: 'Close' }))
    expect(
      screen.getByRole('dialog', { name: '新增二级属性分类' })
    ).toBeInTheDocument()
    expect(templateEditorApi.saveOption).toHaveBeenCalledOnce()
    expect(templateEditorApi.save).not.toHaveBeenCalled()
    const newOptionDraft = templateEditorApi.saveOption.mock
      .calls[0][0] as SaveProductTemplateAttributeLevelTwoOptionInput
    expect(newOptionDraft).toMatchObject({
      categoryKey: 'tech-series',
      value: expect.stringMatching(/^option-[a-f0-9]{32}$/),
    })
    const savedOption = { ...newOptionDraft, id: 'titanium-option', version: 1 }
    templateEditorApi.loadOptions.mockResolvedValue(
      Response.json([...levelTwoOptions, savedOption])
    )
    await act(async () => completeOptionSave(Response.json(savedOption)))
    await screen.findByText('二级属性分类 · 3 项已启用')
    templateEditorApi.saveOption.mockImplementationOnce(
      async (payload: DeltaPayload) => {
        const inactiveOption = {
          ...savedOption,
          active: payload.delta.active.n,
          version: 2,
        }
        templateEditorApi.loadOptions.mockResolvedValue(
          Response.json([...levelTwoOptions, inactiveOption])
        )
        return Response.json(inactiveOption)
      }
    )
    fireEvent.click(
      screen.getByRole('button', { name: '编辑二级属性选项 · 钛合金' })
    )
    fireEvent.click(screen.getByRole('switch', { name: '启用状态' }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('二级属性分类 · 2 项已启用')
    expect(
      screen.queryByRole('button', { name: '编辑二级属性选项 · 钛合金' })
    ).not.toBeInTheDocument()
    expect(templateEditorApi.save).not.toHaveBeenCalled()
  })

  it('opens management at the requested category and updates its name without submitting or resetting the template', async () => {
    templateEditorApi.saveCategory.mockImplementationOnce(
      async (payload: DeltaPayload) => {
        const savedCategory = {
          ...levelOneCategories[0],
          nameZh: payload.delta.nameZh.n,
          version: 2,
        }
        templateEditorApi.loadCategories.mockResolvedValue([
          savedCategory,
          levelOneCategories[1],
        ])
        return Response.json(savedCategory)
      }
    )
    renderProductTemplateManagementForEditorVerification()
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑产品模板 · 工程车圈模板' })
    )
    fireEvent.change(screen.getByRole('textbox', { name: '模板名称' }), {
      target: { value: '管理期间保留的模板草稿' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '管理属性分类' }))
    await screen.findByText('所属一级属性分类 · 材质')
    fireEvent.click(
      screen.getByRole('button', { name: '编辑一级属性分类 · 材质' })
    )
    const categoryDialog = screen.getByRole('dialog', {
      name: '编辑一级属性分类',
    })
    expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(3)
    fireEvent.change(
      within(categoryDialog).getByRole('textbox', { name: '中文名称' }),
      { target: { value: '结构材质' } }
    )
    fireEvent.click(
      within(categoryDialog).getByRole('button', { name: '保存' })
    )
    await screen.findByText('所属一级属性分类 · 结构材质')
    fireEvent.click(screen.getByRole('button', { name: '完成' }))
    expect(screen.getByRole('article', { name: '结构材质' })).toHaveTextContent(
      '碳纤维'
    )
    expect(screen.getByRole('textbox', { name: '模板名称' })).toHaveValue(
      '管理期间保留的模板草稿'
    )
    expect(templateEditorApi.save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '管理属性分类' }))
    fireEvent.click(
      await screen.findByRole('button', { name: /颜色\s*二级属性分类数量: 1/ })
    )
    await screen.findByText('所属一级属性分类 · 颜色')
    fireEvent.keyDown(
      screen.getByRole('dialog', { name: '产品模板属性分类管理' }),
      { key: 'Escape' }
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '产品模板属性分类管理' })
      ).not.toBeInTheDocument()
    )
    expect(
      screen.getByRole('dialog', { name: '编辑产品模板' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '管理属性分类' }))
    await screen.findByText('所属一级属性分类 · 结构材质')
    expect(templateEditorApi.save).not.toHaveBeenCalled()
  })

  it('retains the option draft after a failed save and lets cancellation return to the unchanged template', async () => {
    templateEditorApi.saveOption.mockResolvedValueOnce(
      Response.json({ error: '模拟属性保存失败' }, { status: 500 })
    )
    renderProductTemplateManagementForEditorVerification()
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑产品模板 · 工程车圈模板' })
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑二级属性选项 · 碳纤维' })
    )
    fireEvent.change(screen.getByRole('textbox', { name: '中文名称' }), {
      target: { value: '失败后保留的选项名称' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(templateEditorApi.toastError).toHaveBeenCalled())
    expect(screen.getByRole('textbox', { name: '中文名称' })).toHaveValue(
      '失败后保留的选项名称'
    )
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(
      screen.getByRole('button', { name: '编辑二级属性选项 · 碳纤维' })
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '模板名称' })).toHaveValue(
      existingTemplate.name
    )
    expect(templateEditorApi.save).not.toHaveBeenCalled()
  })

  it('keeps a deleted category binding visible and prevents saving until it is explicitly removed', async () => {
    const queryClient = renderProductTemplateManagementForEditorVerification()
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑产品模板 · 工程车圈模板' })
    )
    await screen.findByText('二级属性分类 · 2 项已启用')
    fireEvent.change(screen.getByRole('textbox', { name: '模板名称' }), {
      target: { value: '保留绑定待处理的草稿' },
    })
    act(() =>
      queryClient.setQueryData(
        PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
        [levelOneCategories[1]]
      )
    )
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: '保存模板' })).toBeDisabled()
    fireEvent.submit(
      screen.getByRole('textbox', { name: '模板名称' }).closest('form')!
    )
    expect(templateEditorApi.save).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: '模板名称' })).toHaveValue(
      '保留绑定待处理的草稿'
    )
    fireEvent.click(screen.getByRole('button', { name: /^移除/ }))
    expect(screen.getByRole('button', { name: '保存模板' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.save).toHaveBeenCalledOnce())
    expect(templateEditorApi.save.mock.calls[0][0]).toMatchObject({
      name: '保留绑定待处理的草稿',
      attributeBindings: [],
    })
  })
})

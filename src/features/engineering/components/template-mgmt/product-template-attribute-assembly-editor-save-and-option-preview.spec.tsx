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
import { type ProductTemplate } from '../../data/schema'
import { DEFAULT_PRODUCT_TEMPLATES } from '../../data/template-defaults'
import { PRODUCT_TEMPLATES_QUERY_KEY } from '../../query-keys'
import { productTemplateService } from '../../services/product-template-service'
import { TemplateMgmt } from '../../tabs/template-mgmt'

const templateEditorApi = vi.hoisted(() => ({
  save: vi.fn(),
  loadTemplates: vi.fn(),
  loadOptions: vi.fn(),
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
        if (pathname.endsWith('/engineering/product-attribute-categories'))
          return Response.json(levelOneCategories)
        if (pathname.endsWith('/engineering/product-attribute-options')) {
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
})

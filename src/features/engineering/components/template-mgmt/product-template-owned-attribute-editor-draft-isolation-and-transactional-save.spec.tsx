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
import { PRODUCT_TEMPLATES_QUERY_KEY } from '../../query-keys'
import { productTemplateService } from '../../services/product-template-service'
import { TemplateMgmt } from '../../tabs/template-mgmt'

const templateEditorApi = vi.hoisted(() => ({
  save: vi.fn(),
  delete: vi.fn(),
  auditRead: vi.fn(),
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

function buildIndependentProductTemplateForEditorTest(
  id: string,
  optionLabel: string
): ProductTemplate {
  return {
    id,
    name: id,
    code: id,
    componentKey: 'RIM',
    description: '原说明',
    active: true,
    createdAt: '2026-10-22T00:00:00Z',
    version: 3,
    attributeBindings: [
      {
        categoryKey: 'brakeType',
        nameZh: '制动类型',
        options: [
          { value: 'disc', labelZh: optionLabel, sortOrder: 1, active: true },
        ],
        sortOrder: 1,
        required: false,
        active: true,
        version: 1,
      },
    ],
  }
}

const queryClients: QueryClient[] = []
let templates: ProductTemplate[]
function renderProductTemplateOwnedAttributeEditorForVerification() {
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

async function openProductTemplateOwnedAttributeEditorForVerification(
  id = '车圈模板'
) {
  fireEvent.click(
    await screen.findByRole('button', { name: `编辑物理规格模板 · ${id}` })
  )
  return screen.getByRole('dialog', { name: `编辑 · ${id}` })
}

describe('template-owned attribute editing and saving', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    templates = [
      buildIndependentProductTemplateForEditorTest('车圈模板', '车圈碟刹'),
      buildIndependentProductTemplateForEditorTest('前叉模板', '前叉碟刹'),
    ]
    vi.stubGlobal(
      'ResizeObserver',
      class ProductTemplateEditorResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    templateEditorApi.save.mockImplementation(
      async (payload: ProductTemplate) => {
        const saved = {
          ...payload,
          id: payload.id || 'new-template',
          version: payload.version + 1,
        }
        templates = [
          ...templates.filter((template) => template.id !== saved.id),
          saved,
        ]
        return Response.json(saved)
      }
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const pathname = decodeURIComponent(
          new URL(String(input), 'http://localhost').pathname
        )
        if (pathname.endsWith('/audit/timeline')) {
          const parameters = new URL(String(input), 'http://localhost')
            .searchParams
          templateEditorApi.auditRead(Object.fromEntries(parameters))
          return Response.json([])
        }
        if (init?.method === 'DELETE') {
          templateEditorApi.delete(pathname)
          templates = templates.filter(
            (template) => !pathname.endsWith(`/${template.id}`)
          )
          return new Response(null, { status: 204 })
        }
        if (!pathname.endsWith('/engineering/templates'))
          throw new Error(`Unexpected catalog request: ${pathname}`)
        if (init?.method === 'POST')
          return templateEditorApi.save(JSON.parse(String(init.body)))
        return Response.json(templates)
      })
    )
    await productTemplateService.getTemplates({ fresh: true })
  })
  afterEach(() => {
    cleanup()
    queryClients.splice(0).forEach((client) => client.clear())
    vi.unstubAllGlobals()
  })

  it('edits definitions directly and saves one complete template while preserving its original version', async () => {
    const queryClient =
      renderProductTemplateOwnedAttributeEditorForVerification()
    const dialog =
      await openProductTemplateOwnedAttributeEditorForVerification()
    expect(
      within(dialog).getByRole('textbox', { name: '制动类型选项 1' })
    ).toHaveValue('车圈碟刹')
    expect(
      screen.queryByRole('button', { name: '共享属性分类库' })
    ).not.toBeInTheDocument()
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '模板名称' }),
      { target: { value: ' 修改后车圈模板 ' } }
    )
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '制动类型选项 1' }),
      { target: { value: '独立碟刹' } }
    )
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '必填' }))
    act(() =>
      queryClient.setQueryData(PRODUCT_TEMPLATES_QUERY_KEY, [
        { ...templates[0], version: 9 },
      ])
    )
    expect(templates[0].attributeBindings[0].options[0].labelZh).toBe(
      '车圈碟刹'
    )
    fireEvent.click(within(dialog).getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.save).toHaveBeenCalledTimes(1))
    expect(templateEditorApi.save.mock.calls[0][0]).toMatchObject({
      name: '修改后车圈模板',
      version: 3,
      code: '车圈模板',
      componentKey: 'RIM',
      attributeBindings: [
        {
          categoryKey: 'brakeType',
          nameZh: '制动类型',
          required: true,
          options: [{ value: 'disc', labelZh: '独立碟刹' }],
        },
      ],
    })
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    const otherDialog =
      await openProductTemplateOwnedAttributeEditorForVerification('前叉模板')
    expect(
      within(otherDialog).getByRole('textbox', { name: '制动类型选项 1' })
    ).toHaveValue('前叉碟刹')
  })

  it('creates attributes and options in the current draft without catalog writes', async () => {
    renderProductTemplateOwnedAttributeEditorForVerification()
    const dialog =
      await openProductTemplateOwnedAttributeEditorForVerification()
    fireEvent.click(within(dialog).getByRole('button', { name: '添加属性' }))
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '属性 2 名称' }),
      { target: { value: '颜色' } }
    )
    const color = within(dialog).getByRole('article', { name: '颜色' })
    fireEvent.click(within(color).getByRole('button', { name: '添加选项' }))
    fireEvent.change(
      within(color).getByRole('textbox', { name: '颜色选项 1' }),
      { target: { value: '蓝色' } }
    )
    expect(templateEditorApi.save).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.save).toHaveBeenCalledTimes(1))
    const definition =
      templateEditorApi.save.mock.calls[0][0].attributeBindings[1]
    expect(definition).toMatchObject({
      nameZh: '颜色',
      options: [{ labelZh: '蓝色', active: true }],
    })
    expect(definition.categoryKey).toMatch(/^category-/)
    expect(definition.options[0].value).toMatch(/^option-/)
  })

  it('cancels all local definition changes without affecting either template', async () => {
    renderProductTemplateOwnedAttributeEditorForVerification()
    const dialog =
      await openProductTemplateOwnedAttributeEditorForVerification()
    fireEvent.click(
      within(dialog).getByRole('button', { name: '删除制动类型选项 1' })
    )
    const confirmation = screen.getByRole('alertdialog', {
      name: '删除规格选项',
    })
    fireEvent.change(within(confirmation).getByRole('textbox'), {
      target: { value: 'DELETE' },
    })
    fireEvent.click(
      within(confirmation).getByRole('button', { name: '确认删除' })
    )
    expect(
      within(dialog).queryByRole('textbox', { name: '制动类型选项 1' })
    ).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }))
    const reopened =
      await openProductTemplateOwnedAttributeEditorForVerification()
    expect(
      within(reopened).getByRole('textbox', { name: '制动类型选项 1' })
    ).toHaveValue('车圈碟刹')
    expect(templateEditorApi.save).not.toHaveBeenCalled()
  })

  it('requires DELETE before removing an option, resets confirmation after cancellation and waits for template save', async () => {
    renderProductTemplateOwnedAttributeEditorForVerification()
    const dialog =
      await openProductTemplateOwnedAttributeEditorForVerification()
    const requestOptionDeletion = () =>
      fireEvent.click(
        within(dialog).getByRole('button', { name: '删除制动类型选项 1' })
      )
    requestOptionDeletion()
    let confirmation = screen.getByRole('alertdialog', { name: '删除规格选项' })
    const confirmButton = within(confirmation).getByRole('button', {
      name: '确认删除',
    })
    expect(confirmButton).toBeDisabled()
    fireEvent.change(within(confirmation).getByRole('textbox'), {
      target: { value: 'delete' },
    })
    expect(confirmButton).toBeDisabled()
    fireEvent.change(within(confirmation).getByRole('textbox'), {
      target: { value: 'DELETE' },
    })
    fireEvent.click(within(confirmation).getByRole('button', { name: '取消' }))
    expect(
      within(dialog).getByRole('textbox', { name: '制动类型选项 1' })
    ).toHaveValue('车圈碟刹')
    requestOptionDeletion()
    confirmation = screen.getByRole('alertdialog', { name: '删除规格选项' })
    expect(within(confirmation).getByRole('textbox')).toHaveValue('')
    fireEvent.change(within(confirmation).getByRole('textbox'), {
      target: { value: 'DELETE' },
    })
    fireEvent.click(
      within(confirmation).getByRole('button', { name: '确认删除' })
    )
    expect(
      within(dialog).queryByRole('textbox', { name: '制动类型选项 1' })
    ).not.toBeInTheDocument()
    expect(templateEditorApi.save).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.save).toHaveBeenCalledTimes(1))
    expect(
      templateEditorApi.save.mock.calls[0][0].attributeBindings[0].options
    ).toEqual([])
  })

  it('requires DELETE before removing an attribute and all its options from the saved template', async () => {
    renderProductTemplateOwnedAttributeEditorForVerification()
    const dialog =
      await openProductTemplateOwnedAttributeEditorForVerification()
    fireEvent.click(
      within(dialog).getByRole('button', { name: '移除制动类型' })
    )
    const confirmation = screen.getByRole('alertdialog', {
      name: '删除规格属性',
    })
    expect(
      within(confirmation).getByText('该属性下的全部选项会同时移除。')
    ).toBeInTheDocument()
    expect(
      within(confirmation).getByRole('button', { name: '确认删除' })
    ).toBeDisabled()
    fireEvent.change(within(confirmation).getByRole('textbox'), {
      target: { value: 'DELETE' },
    })
    fireEvent.click(
      within(confirmation).getByRole('button', { name: '确认删除' })
    )
    expect(
      within(dialog).queryByRole('article', { name: '制动类型' })
    ).not.toBeInTheDocument()
    expect(templateEditorApi.save).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.save).toHaveBeenCalledTimes(1))
    expect(templateEditorApi.save.mock.calls[0][0].attributeBindings).toEqual(
      []
    )
  })

  it('requires DELETE before deleting a template card', async () => {
    renderProductTemplateOwnedAttributeEditorForVerification()
    fireEvent.click(
      await screen.findByRole('button', { name: '删除物理规格模板 · 车圈模板' })
    )
    const confirmation = screen.getByRole('alertdialog', {
      name: '删除物理规格模板',
    })
    expect(
      within(confirmation).getByRole('button', { name: '确认删除' })
    ).toBeDisabled()
    expect(templateEditorApi.delete).not.toHaveBeenCalled()
    fireEvent.change(within(confirmation).getByRole('textbox'), {
      target: { value: 'DELETE' },
    })
    fireEvent.click(
      within(confirmation).getByRole('button', { name: '确认删除' })
    )
    await waitFor(() =>
      expect(templateEditorApi.delete).toHaveBeenCalledTimes(1)
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: '编辑物理规格模板 · 车圈模板' })
      ).not.toBeInTheDocument()
    )
    expect(
      screen.getByRole('button', { name: '编辑物理规格模板 · 前叉模板' })
    ).toBeInTheDocument()
  })

  it('opens the global audit timeline and scopes each card timeline to its template', async () => {
    renderProductTemplateOwnedAttributeEditorForVerification()
    fireEvent.click(await screen.findByRole('button', { name: '变更记录' }))
    await waitFor(() =>
      expect(templateEditorApi.auditRead).toHaveBeenCalledWith({
        module: 'product-template',
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: '变更记录 · 车圈模板' }))
    await waitFor(() =>
      expect(templateEditorApi.auditRead).toHaveBeenCalledWith({
        module: 'product-template',
        target_id: '车圈模板',
      })
    )
  })

  it('retains all entered values after a rejected save and allows correction and retry', async () => {
    templateEditorApi.save.mockRejectedValueOnce(
      new Error('该选项已有产品使用')
    )
    renderProductTemplateOwnedAttributeEditorForVerification()
    const dialog =
      await openProductTemplateOwnedAttributeEditorForVerification()
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '制动类型选项 1' }),
      { target: { value: '保留草稿' } }
    )
    fireEvent.click(within(dialog).getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.toastError).toHaveBeenCalled())
    expect(
      within(dialog).getByRole('textbox', { name: '制动类型选项 1' })
    ).toHaveValue('保留草稿')
    fireEvent.click(within(dialog).getByRole('button', { name: '保存模板' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(templateEditorApi.save).toHaveBeenCalledTimes(2)
  })

  it('blocks duplicate submission and closing while a complete template save is pending', async () => {
    let resolveSave!: (response: Response) => void
    templateEditorApi.save.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveSave = resolve
        })
    )
    renderProductTemplateOwnedAttributeEditorForVerification()
    const dialog =
      await openProductTemplateOwnedAttributeEditorForVerification()
    fireEvent.click(within(dialog).getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(templateEditorApi.save).toHaveBeenCalledTimes(1))
    expect(within(dialog).getByRole('button', { name: '取消' })).toBeDisabled()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () =>
      resolveSave(Response.json({ ...templates[0], version: 4 }))
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })
})

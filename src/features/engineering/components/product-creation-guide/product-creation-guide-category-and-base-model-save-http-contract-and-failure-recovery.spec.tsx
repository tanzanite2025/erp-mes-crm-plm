// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { translate } from '@/locales'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import type { ProductTypeApiDTO } from '../../contracts/product-type-api-dto'
import { buildProductCreationOperationGuideSteps } from '../../data/build-product-creation-operation-guide-steps'
import { createProductTemplateDraft } from '../../utils/default-builders'
import { ProductCreationGuideBusinessOperationDialog } from './product-creation-guide-business-operation-dialog'

const categorySaveHttpTestMocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  getTemplates: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { error: categorySaveHttpTestMocks.toastError, success: vi.fn() },
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'category-save-contract-token' }),
  },
}))
vi.mock('../../services/product-template-service', () => ({
  productTemplateService: {
    getTemplates: categorySaveHttpTestMocks.getTemplates,
  },
}))
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

const selectedTemplateId = '10000000-0000-4000-8000-000000000001'
const existingLevelOneCategory: ProductTypeApiDTO = {
  id: '20000000-0000-4000-8000-000000000001',
  name: '已有一级分类',
  code: 'EXISTING-L1',
  active: true,
  sortOrder: 0,
  version: 1,
}
const existingLevelTwoCategory: ProductTypeApiDTO = {
  id: '20000000-0000-4000-8000-000000000002',
  parentId: existingLevelOneCategory.id,
  name: '已有二级分类',
  code: 'EXISTING-L2',
  active: true,
  sortOrder: 0,
  version: 1,
}
const categorySaveQueryClients: QueryClient[] = []
let storedTypes: ProductTypeApiDTO[]
let submittedCategoryPayloads: ProductTypeApiDTO[]
let createFailureStatus: number | null
let createFailureMessage: string
let templateConfirmationFails: boolean
let createRequestFailureError: Error | null

async function openCategoryCreationDialogInBaseModelStep() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  categorySaveQueryClients.push(queryClient)
  const onCompleted = vi.fn()
  const step = buildProductCreationOperationGuideSteps(
    { permissions: ['menu_engineering', 'perm_manage'] },
    (key) => translate('zh-CN', key)
  ).find((candidate) => candidate.key === 'baseModel')!
  render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider defaultLocale='zh-CN'>
        <ProductCreationGuideBusinessOperationDialog
          step={step}
          progress={{
            completedSteps: {
              template: {
                id: selectedTemplateId,
                label: '已有模板',
                version: 1,
              },
            },
            bomSkipped: false,
          }}
          wizardHeader={<p>当前建档步骤</p>}
          onBusyChange={vi.fn()}
          onClose={vi.fn()}
          onCompleted={onCompleted}
        />
      </LanguageProvider>
    </QueryClientProvider>
  )
  await screen.findByText(/已读取：一级分类/)
  fireEvent.click(screen.getByRole('button', { name: '新增分类或基础型号' }))
  await waitFor(() =>
    expect(
      screen.queryByText('正在读取父级分类和模板…')
    ).not.toBeInTheDocument()
  )
  await waitFor(() =>
    expect(
      screen.getByRole('combobox', { name: '规格模板' })
    ).toHaveTextContent('已有模板')
  )
  return { onCompleted }
}

async function selectProductCategoryCreationParent(optionName: string) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: '父级分类' }), {
    key: 'ArrowDown',
  })
  fireEvent.click(await screen.findByRole('option', { name: optionName }))
}

function fillProductCategoryCreationNameAndCode(name: string, code: string) {
  fireEvent.change(screen.getByRole('textbox', { name: '分类名称' }), {
    target: { value: name },
  })
  fireEvent.change(screen.getByRole('textbox', { name: '分类编码' }), {
    target: { value: code },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  storedTypes = []
  submittedCategoryPayloads = []
  createFailureStatus = null
  createFailureMessage = ''
  templateConfirmationFails = false
  createRequestFailureError = null
  categorySaveHttpTestMocks.getTemplates.mockResolvedValue([
    createProductTemplateDraft({ id: selectedTemplateId, name: '已有模板' }),
  ])
  document.cookie = 'csrf_token=category-save-contract-csrf; path=/'
  vi.stubGlobal(
    'ResizeObserver',
    class ProductCategorySaveHttpContractResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input, init) => {
      const requestUrl = new URL(String(input), 'http://category-save-contract')
      if (
        requestUrl.pathname ===
        '/api/v1/engineering/product-types/template-resolution'
      ) {
        return templateConfirmationFails
          ? Response.json(
              { error: 'Template confirmation unavailable' },
              { status: 503 }
            )
          : Response.json({ resolvedTemplateId: selectedTemplateId })
      }
      if (requestUrl.pathname !== '/api/v1/engineering/product-types')
        throw new Error(
          `Unexpected category save request: ${requestUrl.pathname}`
        )
      if (init?.method !== 'POST') return Response.json(storedTypes)
      const payload = JSON.parse(String(init.body)) as ProductTypeApiDTO
      submittedCategoryPayloads.push(payload)
      if (createRequestFailureError) throw createRequestFailureError
      if (createFailureStatus)
        return Response.json(
          { error: createFailureMessage },
          { status: createFailureStatus }
        )
      const saved = {
        ...payload,
        id: `30000000-0000-4000-8000-${String(storedTypes.length + 1).padStart(12, '0')}`,
        version: 1,
      }
      storedTypes.push(saved)
      return Response.json(saved)
    })
  )
})

afterEach(() => {
  cleanup()
  categorySaveQueryClients.splice(0).forEach((client) => client.clear())
  vi.unstubAllGlobals()
  document.cookie = 'csrf_token=; max-age=0; path=/'
})

describe('step 2 category and base model creation through the actual form and HTTP client', () => {
  it.each(['level1', 'level2', 'baseModel'] as const)(
    'saves a %s record with the correct parent and template payload',
    async (level) => {
      if (level === 'level2') storedTypes = [existingLevelOneCategory]
      if (level === 'baseModel')
        storedTypes = [existingLevelOneCategory, existingLevelTwoCategory]
      const { onCompleted } = await openCategoryCreationDialogInBaseModelStep()
      if (level === 'level2')
        await selectProductCategoryCreationParent('一级分类 · 已有一级分类')
      if (level === 'baseModel')
        await selectProductCategoryCreationParent(
          '二级分类 · 已有一级分类 / 已有二级分类'
        )
      fillProductCategoryCreationNameAndCode('自定义分类或型号', 'CUSTOM-NEW')
      fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
      await waitFor(() => expect(submittedCategoryPayloads).toHaveLength(1))
      expect(submittedCategoryPayloads[0]).toMatchObject({
        id: '',
        name: '自定义分类或型号',
        code: 'CUSTOM-NEW',
        version: 1,
        parentId:
          level === 'level1'
            ? null
            : level === 'level2'
              ? existingLevelOneCategory.id
              : existingLevelTwoCategory.id,
        templateId: selectedTemplateId,
      })
      expect(storedTypes).toHaveLength(
        level === 'level1' ? 1 : level === 'level2' ? 2 : 3
      )
      if (level === 'baseModel')
        await waitFor(() => expect(onCompleted).toHaveBeenCalledOnce())
      else {
        await screen.findByRole('combobox', { name: '选择三级基础型号' })
        expect(onCompleted).not.toHaveBeenCalled()
      }
      expect(categorySaveHttpTestMocks.toastError).not.toHaveBeenCalled()
    }
  )

  it('keeps a manually entered distinct code when the category name also triggers an automatic suggestion', async () => {
    await openCategoryCreationDialogInBaseModelStep()
    fillProductCategoryCreationNameAndCode('山地车车圈', 'MTB-CUSTOM')
    expect(screen.getByRole('textbox', { name: '分类编码' })).toHaveValue(
      'MTB-CUSTOM'
    )
    fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
    await waitFor(() =>
      expect(submittedCategoryPayloads[0]?.code).toBe('MTB-CUSTOM')
    )
  })

  it('allows explicitly choosing no template after retaining the template selected in the previous step', async () => {
    await openCategoryCreationDialogInBaseModelStep()
    fireEvent.keyDown(screen.getByRole('combobox', { name: '规格模板' }), {
      key: 'ArrowDown',
    })
    fireEvent.click(await screen.findByRole('option', { name: '不绑定模板' }))
    fillProductCategoryCreationNameAndCode('自行配置的分类', 'CUSTOM-UNBOUND')
    fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
    await waitFor(() => expect(submittedCategoryPayloads).toHaveLength(1))
    expect(submittedCategoryPayloads[0].templateId).toBeNull()
  })

  it('distinguishes a CSRF rejection from missing category maintenance permissions', async () => {
    createFailureStatus = 403
    createFailureMessage = 'CSRF token missing'
    await openCategoryCreationDialogInBaseModelStep()
    fillProductCategoryCreationNameAndCode('客户填写的分类', 'CSRF-REJECTED')
    fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('会话校验未通过')
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      '没有维护产品分类的权限'
    )
    expect(screen.getByRole('textbox', { name: '分类名称' })).toHaveValue(
      '客户填写的分类'
    )
  })

  it('keeps the draft and explains an uncertain save result without automatically retrying the POST after a network failure', async () => {
    createRequestFailureError = new TypeError('Failed to fetch')
    await openCategoryCreationDialogInBaseModelStep()
    fillProductCategoryCreationNameAndCode(
      '网络异常时保留的分类',
      'NETWORK-FAILURE'
    )
    fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '暂时无法确认是否已保存'
    )
    expect(screen.getByRole('alert')).toHaveTextContent('避免重复新增')
    expect(screen.getByRole('textbox', { name: '分类名称' })).toHaveValue(
      '网络异常时保留的分类'
    )
    expect(screen.getByRole('button', { name: '保存分类' })).toBeEnabled()
    expect(submittedCategoryPayloads).toHaveLength(1)
  })

  it('shows a persistent permission error and preserves the draft when the API rejects creation', async () => {
    createFailureStatus = 403
    createFailureMessage = 'insufficient permissions'
    await openCategoryCreationDialogInBaseModelStep()
    fillProductCategoryCreationNameAndCode('客户填写的分类', 'CUSTOMER-NEW')
    fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '当前账号没有维护产品分类的权限'
    )
    expect(screen.getByRole('textbox', { name: '分类名称' })).toHaveValue(
      '客户填写的分类'
    )
    expect(screen.getByRole('button', { name: '保存分类' })).toBeEnabled()
    expect(storedTypes).toHaveLength(0)
  })

  it('identifies a duplicate code and permits correction without losing the name or hierarchy', async () => {
    createFailureStatus = 500
    createFailureMessage =
      '[SERVER] failed to create product type: duplicate key value violates unique constraint "idx_product_types_code" (SQLSTATE 23505)'
    await openCategoryCreationDialogInBaseModelStep()
    fillProductCategoryCreationNameAndCode(
      '需要保留的分类名称',
      'EXISTING-CODE'
    )
    fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '分类编码已被使用'
    )
    createFailureStatus = null
    fireEvent.change(screen.getByRole('textbox', { name: '分类编码' }), {
      target: { value: 'UNIQUE-CODE' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
    await waitFor(() => expect(storedTypes).toHaveLength(1))
    expect(storedTypes[0]).toMatchObject({
      name: '需要保留的分类名称',
      code: 'UNIQUE-CODE',
    })
  })

  it('reports a saved model with failed template confirmation separately and retries confirmation without creating another record', async () => {
    storedTypes = [existingLevelOneCategory, existingLevelTwoCategory]
    templateConfirmationFails = true
    const { onCompleted } = await openCategoryCreationDialogInBaseModelStep()
    await selectProductCategoryCreationParent(
      '二级分类 · 已有一级分类 / 已有二级分类'
    )
    fillProductCategoryCreationNameAndCode('R50', 'R50')
    fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
    await waitFor(() => expect(storedTypes).toHaveLength(3))
    await waitFor(() =>
      expect(categorySaveHttpTestMocks.toastError).toHaveBeenCalledWith(
        expect.stringContaining('分类已保存，但模板核对失败')
      )
    )
    expect(categorySaveHttpTestMocks.toastError).not.toHaveBeenCalledWith(
      expect.stringContaining('保存失败')
    )
    templateConfirmationFails = false
    fireEvent.click(
      await screen.findByRole('button', { name: '确认使用并继续' })
    )
    await waitFor(() => expect(onCompleted).toHaveBeenCalledOnce())
    expect(submittedCategoryPayloads).toHaveLength(1)
  })

  it('explains form validation failures before attempting any create request', async () => {
    await openCategoryCreationDialogInBaseModelStep()
    fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '请填写分类名称和分类编码'
    )
    expect(submittedCategoryPayloads).toHaveLength(0)
  })
})

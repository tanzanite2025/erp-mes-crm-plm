// @vitest-environment jsdom
import { useState, type ReactElement } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
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
import { type ProductAppearance } from '../../data/product-appearance'
import { PRODUCT_APPEARANCES_QUERY_KEY } from '../../query-keys'
import { productAppearanceService } from '../../services/product-appearance-service'
import { ProductAppearanceEditorDialog } from './product-appearance-editor-dialog'
import { ProductAppearanceManagementDialog } from './product-appearance-management-dialog'

const appearanceApi = vi.hoisted(() => ({
  get: vi.fn(),
  write: vi.fn(),
  upload: vi.fn(),
  saved: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  locale: 'zh-CN' as 'zh-CN' | 'en-US',
}))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: appearanceApi.locale,
    t: (
      key: Parameters<typeof translate>[1],
      params?: Record<string, string | number>
    ) => translate(appearanceApi.locale, key, params),
  }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: { getState: () => ({ accessToken: 'appearance-dialog-test' }) },
}))
vi.mock('sonner', () => ({
  toast: {
    success: appearanceApi.toastSuccess,
    error: appearanceApi.toastError,
  },
}))

const existingAppearance: ProductAppearance = {
  id: 'appearance-ud',
  name: 'UD',
  barcodeCode: '1',
  description: 'Old description',
  imageUrl: '/uploads/old.png',
  imageThumbnailUrl: '/uploads/old.png',
  imageName: 'old.png',
  active: true,
  sortOrder: 10,
  version: 3,
  createdAt: '2026-10-21T00:00:00Z',
  updatedAt: '2026-10-21T00:00:00Z',
}
let persistedAppearances: ProductAppearance[] = []
const queryClients: QueryClient[] = []

function renderProductAppearanceBusinessComponent(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClients.push(queryClient)
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    ),
  }
}

function ProductAppearanceQuickCreateAndSelectionCaller({
  editingId,
}: {
  editingId?: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedAppearance, setSelectedAppearance] =
    useState<ProductAppearance>()
  const catalog = useQuery({
    queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
    queryFn: () => productAppearanceService.getProductAppearances(),
  })
  return (
    <>
      <button onClick={() => setOpen(true)}>Open appearance editor</button>
      <output aria-label='Selected appearance'>
        {selectedAppearance?.name ?? ''}
      </output>
      <output aria-label='Cached appearances'>
        {catalog.data?.map((item) => item.name).join(', ')}
      </output>
      <ProductAppearanceEditorDialog
        open={open}
        onOpenChange={setOpen}
        appearance={catalog.data?.find((item) => item.id === editingId)}
        onSaved={(saved) => {
          setSelectedAppearance(saved)
          appearanceApi.saved(saved)
        }}
      />
    </>
  )
}

async function openAndFillProductAppearanceCreationDraft(
  name = 'New appearance',
  barcodeCode = '7'
) {
  fireEvent.click(
    screen.getByRole('button', { name: 'Open appearance editor' })
  )
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
  )
  fireEvent.change(screen.getByRole('textbox', { name: '外观名称' }), {
    target: { value: name },
  })
  fireEvent.change(screen.getByRole('textbox', { name: '条码位值' }), {
    target: { value: barcodeCode },
  })
}

describe('reusable product appearance business dialog HTTP and caller data flow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal(
      'ResizeObserver',
      class ProductAppearanceBusinessDialogResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    appearanceApi.locale = 'zh-CN'
    persistedAppearances = [{ ...existingAppearance }]
    appearanceApi.get.mockImplementation(async () =>
      Response.json(persistedAppearances)
    )
    appearanceApi.upload.mockResolvedValue({
      status: 'success',
      url: '/uploads/new.png',
      fileName: 'new.png',
      size: 100,
    })
    appearanceApi.write.mockImplementation(
      async (
        method: string,
        pathname: string,
        payload: Record<string, unknown>
      ) => {
        if (method === 'DELETE') {
          persistedAppearances = persistedAppearances.filter(
            (item) => !pathname.endsWith(`/${item.id}`)
          )
          return Response.json({ success: true })
        }
        let saved: ProductAppearance
        if (method === 'PATCH') {
          const metadata = payload.metadata as { id: string; version: number }
          const original = persistedAppearances.find(
            (item) => item.id === metadata.id
          )!
          if (metadata.version !== original.version)
            return Response.json({ error: 'Version conflict' }, { status: 409 })
          const changes = Object.fromEntries(
            Object.entries(payload.delta as Record<string, { n: unknown }>).map(
              ([key, change]) => [key, change.n]
            )
          )
          saved = { ...original, ...changes, version: original.version + 1 }
        } else {
          saved = {
            ...payload,
            sortOrder: 70,
            version: 1,
            createdAt: '2026-10-21T00:00:00Z',
            updatedAt: '2026-10-21T00:00:00Z',
          } as unknown as ProductAppearance
        }
        persistedAppearances = [
          ...persistedAppearances.filter((item) => item.id !== saved.id),
          saved,
        ]
        return Response.json(saved)
      }
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const pathname = new URL(String(input), 'http://localhost').pathname
        if (pathname.endsWith('/assets/upload'))
          return Response.json(await appearanceApi.upload(init?.body))
        if (pathname.includes('/engineering/product-appearances')) {
          if (!init?.method || init.method === 'GET') return appearanceApi.get()
          return appearanceApi.write(
            init.method,
            pathname,
            init.body ? JSON.parse(String(init.body)) : undefined
          )
        }
        throw new Error(`Unexpected appearance request: ${pathname}`)
      })
    )
  })
  afterEach(() => {
    cleanup()
    queryClients.splice(0).forEach((client) => client.clear())
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns the saved record to a caller and keeps it in shared data even when background refresh fails', async () => {
    const { queryClient } = renderProductAppearanceBusinessComponent(
      <ProductAppearanceQuickCreateAndSelectionCaller />
    )
    await openAndFillProductAppearanceCreationDraft('  Carbon appearance  ')
    fireEvent.click(screen.getByRole('switch', { name: '启用状态' }))
    appearanceApi.get.mockImplementation(async () =>
      Response.json({ error: 'Refresh unavailable' }, { status: 500 })
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(appearanceApi.saved).toHaveBeenCalledOnce())
    const saved = appearanceApi.saved.mock.calls[0][0]
    expect(saved).toMatchObject({
      name: 'Carbon appearance',
      barcodeCode: '7',
      active: false,
      sortOrder: 70,
      version: 1,
    })
    expect(screen.getByLabelText('Selected appearance')).toHaveTextContent(
      'Carbon appearance'
    )
    expect(
      queryClient.getQueryData<ProductAppearance[]>(
        PRODUCT_APPEARANCES_QUERY_KEY
      )
    ).toContainEqual(saved)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(appearanceApi.toastError).not.toHaveBeenCalled()
  })

  it('retains a failed creation draft and its identity, and blocks duplicate submissions and closing during a pending save', async () => {
    appearanceApi.write.mockResolvedValueOnce(
      Response.json({ error: 'Save unavailable' }, { status: 500 })
    )
    renderProductAppearanceBusinessComponent(
      <ProductAppearanceQuickCreateAndSelectionCaller />
    )
    await openAndFillProductAppearanceCreationDraft()
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(appearanceApi.toastError).toHaveBeenCalled())
    const draft = appearanceApi.write.mock.calls[0][2]
    expect(screen.getByRole('textbox', { name: '外观名称' })).toHaveValue(
      'New appearance'
    )
    let finishSave!: (response: Response) => void
    appearanceApi.write.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finishSave = resolve
        })
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByRole('button', { name: '保存中…' })
    expect(screen.getByRole('textbox', { name: '外观名称' })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: '保存中…' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(appearanceApi.write).toHaveBeenCalledTimes(2)
    expect(appearanceApi.write.mock.calls[1][2].id).toBe(draft.id)
    await act(async () => finishSave(Response.json({ ...draft, version: 1 })))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    await openAndFillProductAppearanceCreationDraft('Another appearance', '8')
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(appearanceApi.write).toHaveBeenCalledTimes(3))
    expect(appearanceApi.write.mock.calls[2][2].id).not.toBe(draft.id)
  })

  it('submits explicit clears and inactive status using the original edit version after caller data changes', async () => {
    const { queryClient } = renderProductAppearanceBusinessComponent(
      <ProductAppearanceQuickCreateAndSelectionCaller
        editingId={existingAppearance.id}
      />
    )
    await screen.findByText('UD', {
      selector: 'output[aria-label="Cached appearances"]',
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Open appearance editor' })
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    )
    fireEvent.change(screen.getByRole('textbox', { name: '说明' }), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: '移除图片' }))
    fireEvent.click(screen.getByRole('switch', { name: '启用状态' }))
    act(() => {
      queryClient.setQueryData(PRODUCT_APPEARANCES_QUERY_KEY, [
        {
          ...existingAppearance,
          version: 9,
          description: 'Newer background description',
        },
      ])
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(appearanceApi.saved).toHaveBeenCalledOnce())
    expect(appearanceApi.write.mock.calls[0]).toEqual([
      'PATCH',
      '/api/v1/engineering/product-appearances/appearance-ud',
      {
        op: 'PATCH',
        metadata: {
          id: existingAppearance.id,
          version: 3,
          intent: 'PRODUCT_APPEARANCE_SAVE',
        },
        delta: {
          description: { o: 'Old description', n: '' },
          imageUrl: { o: '/uploads/old.png', n: '' },
          imageThumbnailUrl: { o: '/uploads/old.png', n: '' },
          imageName: { o: 'old.png', n: '' },
          active: { o: true, n: false },
        },
      },
    ])
    expect(appearanceApi.saved.mock.calls[0][0]).toMatchObject({
      description: '',
      imageUrl: '',
      active: false,
      version: 4,
    })
  })

  it('shows catalog failures without a false empty state and retains entered data on retry and duplicate-code validation', async () => {
    appearanceApi.get.mockImplementation(async () =>
      Response.json({ error: 'Catalog unavailable' }, { status: 500 })
    )
    renderProductAppearanceBusinessComponent(
      <ProductAppearanceQuickCreateAndSelectionCaller />
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Open appearance editor' })
    )
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: '外观名称' }), {
      target: { value: 'Retained draft' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: '条码位值' }), {
      target: { value: '1' },
    })
    appearanceApi.get.mockImplementation(async () =>
      Response.json(persistedAppearances)
    )
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存' })).toBeEnabled()
    )
    expect(screen.getByRole('textbox', { name: '外观名称' })).toHaveValue(
      'Retained draft'
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(appearanceApi.write).not.toHaveBeenCalled()
    expect(appearanceApi.toastError).toHaveBeenCalledWith(
      '该条码位值已被其他外观占用'
    )
  })

  it('uploads image bytes through the asset API and saves only the returned image address', async () => {
    renderProductAppearanceBusinessComponent(
      <ProductAppearanceQuickCreateAndSelectionCaller />
    )
    await openAndFillProductAppearanceCreationDraft()
    const image = new File(['image-content'], 'new.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('外观图片'), {
      target: { files: [image] },
    })
    await screen.findByRole('button', { name: '更换图片' })
    expect(
      (appearanceApi.upload.mock.calls[0][0] as FormData).get('file')
    ).toBeInstanceOf(File)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(appearanceApi.saved).toHaveBeenCalledOnce())
    expect(appearanceApi.write.mock.calls[0][2]).toMatchObject({
      imageUrl: '/uploads/new.png',
      imageThumbnailUrl: '/uploads/new.png',
      imageName: 'new.png',
    })
  })

  it('supports nested management editing and choosing an active appearance in an English caller', async () => {
    appearanceApi.locale = 'en-US'
    persistedAppearances.push({
      ...existingAppearance,
      id: 'inactive',
      name: 'Inactive appearance',
      barcodeCode: '2',
      active: false,
    })
    const onSelected = vi.fn()
    const onOpenChange = vi.fn()
    renderProductAppearanceBusinessComponent(
      <ProductAppearanceManagementDialog
        open
        onOpenChange={onOpenChange}
        onAppearanceSelected={onSelected}
        onAppearanceSaved={appearanceApi.saved}
      />
    )
    const inactiveCard = await screen.findByRole('article', {
      name: 'Inactive appearance',
    })
    expect(
      within(inactiveCard).getByRole('button', { name: 'Select' })
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Edit · UD' }))
    const editor = screen.getByRole('dialog', {
      name: 'Edit Product Appearance',
    })
    fireEvent.change(
      within(editor).getByRole('textbox', { name: 'Appearance Name' }),
      { target: { value: 'Updated appearance' } }
    )
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(appearanceApi.saved).toHaveBeenCalledOnce())
    expect(
      screen.getByRole('dialog', { name: 'Product Appearance Management' })
    ).toBeInTheDocument()
    const activeCard = await screen.findByRole('article', {
      name: 'Updated appearance',
    })
    fireEvent.click(within(activeCard).getByRole('button', { name: 'Select' }))
    expect(onSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingAppearance.id,
        name: 'Updated appearance',
        version: 4,
      })
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('retains a conflicting edit draft and removes deleted appearances from shared data even if refresh fails', async () => {
    renderProductAppearanceBusinessComponent(
      <ProductAppearanceManagementDialog open onOpenChange={vi.fn()} />
    )
    fireEvent.click(await screen.findByRole('button', { name: '编辑 · UD' }))
    fireEvent.change(screen.getByRole('textbox', { name: '外观名称' }), {
      target: { value: 'Conflicting draft' },
    })
    appearanceApi.write.mockResolvedValueOnce(
      Response.json({ error: 'Version conflict' }, { status: 409 })
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(appearanceApi.toastError).toHaveBeenCalled())
    expect(screen.getByRole('textbox', { name: '外观名称' })).toHaveValue(
      'Conflicting draft'
    )
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    appearanceApi.get.mockImplementation(async () =>
      Response.json({ error: 'Refresh unavailable' }, { status: 500 })
    )
    fireEvent.click(screen.getByRole('button', { name: '删除 · UD' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('article', { name: 'UD' })
      ).not.toBeInTheDocument()
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(appearanceApi.write.mock.calls[1][0]).toBe('DELETE')
    vi.mocked(window.confirm).mockRestore()
  })
})

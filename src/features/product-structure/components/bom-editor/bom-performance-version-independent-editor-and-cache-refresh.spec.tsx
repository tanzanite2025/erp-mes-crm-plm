// @vitest-environment jsdom
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { translate } from '@/locales'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { Form } from '@/components/ui/form'
import { productSchema } from '@/features/engineering/data/schema'
import { type BOM } from '../../data/schema'
import {
  BOMPerformanceVersionOptionService,
  type BOMPerformanceVersionOption,
} from '../../services/bom-performance-version-option-service'
import { createEmptyBOMFormValue } from '../../utils/bom-form-defaults'
import { BOMPerformanceVersionOptionManagementDialog } from './bom-performance-version-option-management-dialog'
import { BOMProductConfigurationInformationPanel } from './bom-product-configuration-information-panel'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: Parameters<typeof translate>[1]) => translate('zh-CN', key),
  }),
}))
vi.mock('@/features/basic-settings/hooks/use-units-query', () => ({
  useUnitsQuery: () => ({
    units: [
      { id: 'g', code: 'g', name: '克', category: 'WEIGHT', status: 'active' },
      {
        id: 'kg',
        code: 'kg',
        name: '千克',
        category: 'WEIGHT',
        status: 'active',
      },
    ],
  }),
}))
vi.mock('@/features/trading/customer', () => ({ getCustomers: async () => [] }))
const performanceVersionTestNotifications = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: performanceVersionTestNotifications }))

const queryClients: QueryClient[] = []
let storedOptions: BOMPerformanceVersionOption[]
let savedRequests: Record<string, unknown>[]
let storedBOMs: BOM[]

function renderIndependentBOMPerformanceVersionFlow(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClients.push(queryClient)
  render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return queryClient
}

function BOMProductInformationWithIndependentPerformanceVersionCatalog({
  initialBOM,
  onBOMSubmit,
}: { initialBOM?: Partial<BOM>; onBOMSubmit?: (bom: BOM) => void } = {}) {
  const form = useForm<BOM>({
    defaultValues: {
      bomType: 'EBOM',
      ownerType: 'INTERNAL',
      versionLevel: '',
      bomVersion: 'V1.0',
      ...initialBOM,
    },
  })
  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onBOMSubmit?.(form.getValues())
        }}
      >
        <BOMProductConfigurationInformationPanel
          form={form}
          products={
            initialBOM
              ? ['model-a', 'model-b'].map((id) =>
                  productSchema.parse({
                    id,
                    sku: id,
                    name: id === 'model-a' ? 'R50' : 'R60',
                    typeId: 'rim',
                    createdAt: '2026-10-23',
                  })
                )
              : []
          }
          productDisplayLabelMap={new Map()}
          isEdit={false}
        />
        {onBOMSubmit && <button type='submit'>保存 BOM 草稿</button>}
      </form>
    </Form>
  )
}

function ReopenableIndependentPerformanceVersionManagementDialog() {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button onClick={() => setOpen(true)}>再次新增</button>
      <BOMPerformanceVersionOptionManagementDialog
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

function createStoredBOMPerformanceVersionOption(): BOMPerformanceVersionOption {
  return {
    id: 'standard-performance-version',
    categoryKey: 'versionLevel',
    value: 'std',
    labelZh: '标准版',
    labelEn: 'Standard',
    description: '原说明',
    active: true,
    sortOrder: 10,
    version: 3,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'ResizeObserver',
    class BOMPerformanceVersionResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  storedOptions = []
  savedRequests = []
  storedBOMs = []
  vi.mocked(apiFetch).mockImplementation(async (path, init) => {
    if (path.startsWith('/engineering/bom?')) return storedBOMs
    if (
      path.startsWith('/engineering/product-attribute-options/') &&
      init?.method === 'DELETE'
    ) {
      storedOptions = storedOptions.filter(
        (option) => option.id !== path.split('/').pop()
      )
      return undefined
    }
    if (
      path.startsWith('/engineering/product-attribute-options') &&
      !init?.method
    )
      return [...storedOptions]
    if (
      path === '/engineering/product-attribute-options' &&
      init?.method === 'POST'
    ) {
      const payload = JSON.parse(String(init.body))
      savedRequests.push(payload)
      if (payload.op === 'PATCH') {
        const current = storedOptions.find(
          (option) => option.id === payload.metadata.id
        )!
        const updatedFields = Object.fromEntries(
          Object.entries(payload.delta).map(([key, change]) => [
            key,
            (change as { n: unknown }).n,
          ])
        )
        const saved = {
          ...current,
          ...updatedFields,
          version: current.version + 1,
        }
        storedOptions = storedOptions.map((option) =>
          option.id === saved.id ? saved : option
        )
        return saved
      }
      const saved = {
        ...payload,
        id: 'new-performance-version',
        sortOrder: 10,
        version: 1,
      } as BOMPerformanceVersionOption
      storedOptions.push(saved)
      return saved
    }
    throw new Error(`Unexpected product category dependency: ${path}`)
  })
})

afterEach(() => {
  cleanup()
  queryClients.splice(0).forEach((client) => client.clear())
})

describe('independent BOM performance version editor', () => {
  it('requires a product before opening version settings and enables the controls after selecting one', async () => {
    storedOptions = [createStoredBOMPerformanceVersionOption()]
    renderIndependentBOMPerformanceVersionFlow(
      <BOMProductInformationWithIndependentPerformanceVersionCatalog
        initialBOM={{}}
      />
    )
    const managementButton = screen.getByRole('button', {
      name: '管理性能版本选项',
    }) as HTMLButtonElement
    const versionDropdown = screen.getByRole('combobox', {
      name: '性能版本',
    }) as HTMLButtonElement
    expect(managementButton.disabled).toBe(true)
    expect(managementButton.title).toBe('请先选择产品')
    expect(versionDropdown.disabled).toBe(true)
    expect(versionDropdown.textContent).toBe('请先选择产品')
    expect(
      screen.getByText('请先选择产品，再设置性能版本和重量。')
    ).toBeTruthy()
    fireEvent.click(managementButton)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.some(([path]) => path.startsWith('/engineering/bom?'))
    ).toBe(false)

    fireEvent.click(screen.getByRole('combobox', { name: '产品' }))
    fireEvent.click(await screen.findByRole('option', { name: 'R50' }))
    expect(managementButton.disabled).toBe(false)
    expect(managementButton.title).toBe('管理性能版本和重量')
    await waitFor(() => expect(versionDropdown.disabled).toBe(false))
    fireEvent.click(managementButton)
    const dialog = await screen.findByRole('dialog', { name: '性能版本选项' })
    expect(within(dialog).getByText(/R50/)).toBeTruthy()
    expect(
      await within(dialog).findByRole('button', { name: '标准版' })
    ).toBeTruthy()
  })

  it('shows weights beside the actual model versions and keeps unused shared versions as choices', async () => {
    storedOptions = [
      createStoredBOMPerformanceVersionOption(),
      {
        ...createStoredBOMPerformanceVersionOption(),
        id: 'lightweight',
        value: 'lightweight',
        labelZh: '轻量版',
      },
      {
        ...createStoredBOMPerformanceVersionOption(),
        id: 'reinforced',
        value: 'reinforced',
        labelZh: '加强版',
      },
    ]
    storedBOMs = [
      createEmptyBOMFormValue({
        id: 'std-bom',
        productId: 'model-a',
        versionLevel: 'std',
        measuredWeight: 480,
        measuredWeightUnit: 'g',
        status: 'RELEASED',
      }),
      createEmptyBOMFormValue({
        id: 'other-model-bom',
        productId: 'model-b',
        versionLevel: 'reinforced',
        measuredWeight: 900,
        measuredWeightUnit: 'g',
      }),
    ]
    renderIndependentBOMPerformanceVersionFlow(
      <BOMProductInformationWithIndependentPerformanceVersionCatalog
        initialBOM={{
          productId: 'model-a',
          versionLevel: 'lightweight',
          measuredWeight: 520,
          measuredWeightUnit: 'g',
        }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '管理性能版本选项' }))
    const dialog = await screen.findByRole('dialog', { name: '性能版本选项' })
    const standardButton = await within(dialog).findByRole('button', {
      name: '标准版',
    })
    await within(standardButton).findByText('480 g')
    expect(
      within(within(dialog).getByRole('button', { name: '轻量版' })).getByText(
        '520 g'
      )
    ).toBeTruthy()
    expect(within(dialog).getByText('本型号已有版本')).toBeTruthy()
    expect(within(dialog).getByText('其他可选版本')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: '加强版' }))
    expect(
      (
        within(dialog).getByRole('spinbutton', {
          name: '本版本重量',
        }) as HTMLInputElement
      ).value
    ).toBe('')
    expect(within(dialog).queryByText('900 g')).toBeNull()
    expect(within(dialog).queryByText('0 g')).toBeNull()
    const request = vi
      .mocked(apiFetch)
      .mock.calls.find(([path]) => path.startsWith('/engineering/bom?'))![0]
    expect(request).toContain('options=true')
    expect(request).toContain('productId=model-a')
  })

  it('keeps each selected version’s weight draft, applies it with the BOM and does not submit the BOM when saving a shared option', async () => {
    storedOptions = [
      createStoredBOMPerformanceVersionOption(),
      {
        ...createStoredBOMPerformanceVersionOption(),
        id: 'lightweight',
        value: 'lightweight',
        labelZh: '轻量版',
      },
      {
        ...createStoredBOMPerformanceVersionOption(),
        id: 'reinforced',
        value: 'reinforced',
        labelZh: '加强版',
      },
    ]
    storedBOMs = [
      createEmptyBOMFormValue({
        id: 'std-bom',
        productId: 'model-a',
        versionLevel: 'std',
        measuredWeight: 480,
        measuredWeightUnit: 'g',
      }),
    ]
    const saveBOMDraft = vi.fn()
    renderIndependentBOMPerformanceVersionFlow(
      <BOMProductInformationWithIndependentPerformanceVersionCatalog
        initialBOM={{
          productId: 'model-a',
          versionLevel: 'lightweight',
          measuredWeight: 420,
          measuredWeightUnit: 'g',
        }}
        onBOMSubmit={saveBOMDraft}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '管理性能版本选项' }))
    let dialog = await screen.findByRole('dialog', { name: '性能版本选项' })
    fireEvent.change(
      await within(dialog).findByRole('spinbutton', { name: '本版本重量' }),
      { target: { value: '430' } }
    )
    expect(
      within(dialog).getByRole('combobox', { name: '重量单位' }).textContent
    ).toContain('g')
    fireEvent.click(within(dialog).getByRole('button', { name: '标准版' }))
    await within(
      within(dialog).getByRole('button', { name: '标准版' })
    ).findByText('480 g')
    expect(
      (
        within(dialog).getByRole('spinbutton', {
          name: '本版本重量',
        }) as HTMLInputElement
      ).value
    ).toBe('480')
    fireEvent.click(within(dialog).getByRole('button', { name: '轻量版' }))
    expect(
      (
        within(dialog).getByRole('spinbutton', {
          name: '本版本重量',
        }) as HTMLInputElement
      ).value
    ).toBe('430')
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '性能版本名称' }),
      { target: { value: '轻量性能版' } }
    )
    fireEvent.click(
      within(dialog).getByRole('button', { name: '保存共用选项' })
    )
    await waitFor(() =>
      expect(performanceVersionTestNotifications.success).toHaveBeenCalled()
    )
    expect(saveBOMDraft).not.toHaveBeenCalled()
    expect(savedRequests[0]).not.toHaveProperty('measuredWeight')
    expect(savedRequests[0].delta).not.toHaveProperty('measuredWeight')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: '管理性能版本选项' }))
    dialog = await screen.findByRole('dialog', { name: '性能版本选项' })
    fireEvent.click(within(dialog).getByRole('button', { name: '加强版' }))
    expect(
      (
        within(dialog).getByRole('spinbutton', {
          name: '本版本重量',
        }) as HTMLInputElement
      ).value
    ).toBe('')
    fireEvent.change(
      within(dialog).getByRole('spinbutton', { name: '本版本重量' }),
      { target: { value: '550' } }
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: '保存 BOM 草稿' }))
    expect(saveBOMDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'model-a',
        versionLevel: 'reinforced',
        measuredWeight: 550,
      })
    )
    expect(storedBOMs).toHaveLength(1)
  })

  it('edits version weight and units together in the dialog and shows both in the single BOM dropdown', async () => {
    storedOptions = [
      createStoredBOMPerformanceVersionOption(),
      {
        ...createStoredBOMPerformanceVersionOption(),
        id: 'ultralight',
        value: 'ultralight',
        labelZh: '超轻版',
      },
    ]
    storedBOMs = [
      createEmptyBOMFormValue({
        id: 'std-bom',
        productId: 'model-a',
        versionLevel: 'std',
        measuredWeight: 480,
        measuredWeightUnit: 'g',
        status: 'RELEASED',
      }),
    ]
    const saveBOMDraft = vi.fn()
    renderIndependentBOMPerformanceVersionFlow(
      <BOMProductInformationWithIndependentPerformanceVersionCatalog
        initialBOM={{ productId: 'model-a', versionLevel: '' }}
        onBOMSubmit={saveBOMDraft}
      />
    )
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByRole('combobox', { name: '重量单位' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '管理性能版本选项' }))
    const dialog = await screen.findByRole('dialog', { name: '性能版本选项' })
    const firstVersionWeight = await within(dialog).findByRole('spinbutton', {
      name: '本版本重量',
    })
    expect((firstVersionWeight as HTMLInputElement).disabled).toBe(false)
    expect(
      (
        within(dialog).getByRole('combobox', {
          name: '重量单位',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false)
    await within(
      within(dialog).getByRole('button', { name: '标准版' })
    ).findByText('480 g')
    fireEvent.click(within(dialog).getByRole('button', { name: '超轻版' }))
    fireEvent.change(
      within(dialog).getByRole('spinbutton', { name: '本版本重量' }),
      { target: { value: '420.5' } }
    )
    fireEvent.click(within(dialog).getByRole('combobox', { name: '重量单位' }))
    fireEvent.click(await screen.findByRole('option', { name: 'g (克)' }))
    expect(
      within(within(dialog).getByRole('button', { name: '超轻版' })).getByText(
        '420.5 g'
      )
    ).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    const versionDropdown = screen.getByRole('combobox', { name: '性能版本' })
    expect(versionDropdown.textContent).toContain('超轻版 · 420.5 g')
    fireEvent.click(versionDropdown)
    fireEvent.click(
      await screen.findByRole('option', { name: '标准版 · 480 g' })
    )
    fireEvent.click(versionDropdown)
    fireEvent.click(
      await screen.findByRole('option', { name: '超轻版 · 420.5 g · 本次暂存' })
    )
    expect(versionDropdown.textContent).toContain('超轻版 · 420.5 g')
    fireEvent.click(screen.getByRole('button', { name: '保存 BOM 草稿' }))
    expect(saveBOMDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'model-a',
        versionLevel: 'ultralight',
        measuredWeight: 420.5,
        measuredWeightUnit: 'g',
      })
    )
    expect(savedRequests).toHaveLength(0)
    expect(storedBOMs).toHaveLength(1)
  })

  it('keeps lifecycle-locked BOM weights read-only inside the combined version editor', async () => {
    storedOptions = [createStoredBOMPerformanceVersionOption()]
    renderIndependentBOMPerformanceVersionFlow(
      <BOMProductInformationWithIndependentPerformanceVersionCatalog
        initialBOM={{
          productId: 'model-a',
          versionLevel: 'std',
          measuredWeight: 480,
          measuredWeightUnit: 'mg',
          isLocked: true,
          status: 'RELEASED',
        }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '管理性能版本选项' }))
    const dialog = await screen.findByRole('dialog', { name: '性能版本选项' })
    expect(
      (
        (await within(dialog).findByRole('spinbutton', {
          name: '本版本重量',
        })) as HTMLInputElement
      ).disabled
    ).toBe(true)
    const unitDropdown = within(dialog).getByRole('combobox', {
      name: '重量单位',
    }) as HTMLButtonElement
    expect(unitDropdown.disabled).toBe(true)
    expect(unitDropdown.textContent).toContain('mg')
  })

  it.each([
    {
      fieldLabel: '产品',
      optionLabel: 'R60',
      expectedScope: { productId: 'model-b' },
    },
    {
      fieldLabel: '归属',
      optionLabel: '客户专供',
      expectedScope: { ownerType: 'CUSTOMER' },
    },
  ])(
    'clears the previous scope’s version weight when $fieldLabel changes',
    async ({ fieldLabel, optionLabel, expectedScope }) => {
      storedOptions = [createStoredBOMPerformanceVersionOption()]
      const saveBOMDraft = vi.fn()
      renderIndependentBOMPerformanceVersionFlow(
        <BOMProductInformationWithIndependentPerformanceVersionCatalog
          initialBOM={{
            productId: 'model-a',
            versionLevel: 'std',
            measuredWeight: 480,
            measuredWeightUnit: 'g',
            bomVersion: 'V2.0',
            status: 'DRAFT',
          }}
          onBOMSubmit={saveBOMDraft}
        />
      )
      fireEvent.click(screen.getByRole('combobox', { name: fieldLabel }))
      fireEvent.click(await screen.findByRole('option', { name: optionLabel }))
      fireEvent.click(screen.getByRole('button', { name: '保存 BOM 草稿' }))
      expect(saveBOMDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          ...expectedScope,
          versionLevel: '',
          measuredWeight: 0,
          measuredWeightUnit: '',
          bomVersion: 'V2.0',
          status: 'DRAFT',
        })
      )
      expect(savedRequests).toHaveLength(0)
      expect(storedBOMs).toHaveLength(0)
    }
  )

  it('opens from the BOM icon without querying or selecting product categories and refreshes the BOM dropdown after saving', async () => {
    const saveBOMDraft = vi.fn()
    renderIndependentBOMPerformanceVersionFlow(
      <BOMProductInformationWithIndependentPerformanceVersionCatalog
        initialBOM={{ productId: 'model-a' }}
        onBOMSubmit={saveBOMDraft}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '管理性能版本选项' }))
    const managementDialog = await screen.findByRole('dialog', {
      name: '性能版本选项',
    })
    await within(managementDialog).findByText(
      '暂无性能版本，可添加标准版、轻量版等选项。'
    )
    fireEvent.click(
      within(managementDialog).getByRole('button', { name: '添加性能版本选项' })
    )
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(
      within(managementDialog).getByRole('heading', { name: '新增性能版本' })
    ).toBeTruthy()
    expect(within(managementDialog).queryByRole('combobox')).toBeNull()
    expect(within(managementDialog).queryByText(/属性分类/)).toBeNull()
    fireEvent.change(
      within(managementDialog).getByRole('textbox', { name: '性能版本名称' }),
      {
        target: { value: '  轻量版  ' },
      }
    )
    fireEvent.click(
      within(managementDialog).getByRole('button', { name: '保存共用选项' })
    )
    await waitFor(() =>
      expect(
        within(managementDialog)
          .getByRole('button', { name: '轻量版' })
          .getAttribute('aria-pressed')
      ).toBe('true')
    )
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(
      within(managementDialog).getByRole('heading', { name: '编辑性能版本' })
    ).toBeTruthy()
    expect(savedRequests[0]).toMatchObject({
      categoryKey: 'versionLevel',
      labelZh: '轻量版',
      active: true,
    })
    expect(String(savedRequests[0].value).length).toBeLessThanOrEqual(50)
    expect(within(managementDialog).getByText('轻量版')).toBeTruthy()
    expect(performanceVersionTestNotifications.success).toHaveBeenCalledWith(
      '性能版本已保存，可在下拉菜单中选择。'
    )
    expect(
      (
        within(managementDialog).getByRole('button', {
          name: '已保存',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const performanceVersionField = screen.getByText('性能版本', {
      selector: 'label',
    }).parentElement!.parentElement!
    fireEvent.click(within(performanceVersionField).getByRole('combobox'))
    expect(
      (await screen.findAllByRole('option')).map((option) => option.textContent)
    ).toContain('轻量版 · 未填重量')
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    const versionDropdown = screen.getByRole('combobox', { name: '性能版本' })
    expect(versionDropdown.textContent).toBe('轻量版 · 未填重量')
    expect(saveBOMDraft).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '保存 BOM 草稿' }))
    expect(saveBOMDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'model-a',
        versionLevel: savedRequests[0].value,
      })
    )
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.some(([path]) =>
          path.includes('product-attribute-categories')
        )
    ).toBe(false)
  })

  it('edits an existing version using its original machine value and versioned delta', async () => {
    const original = createStoredBOMPerformanceVersionOption()
    storedOptions = [original]
    renderIndependentBOMPerformanceVersionFlow(
      <ReopenableIndependentPerformanceVersionManagementDialog />
    )
    await screen.findByRole('button', { name: '标准版' })
    fireEvent.change(screen.getByRole('textbox', { name: '性能版本名称' }), {
      target: { value: '标准性能版' },
    })
    fireEvent.change(screen.getByLabelText('英文名称（选填）'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(savedRequests).toHaveLength(1))
    expect(savedRequests[0]).toMatchObject({
      op: 'PATCH',
      metadata: { id: original.id, version: 3 },
      delta: { labelZh: { n: '标准性能版' }, labelEn: { n: '' } },
    })
    expect(
      (savedRequests[0].delta as Record<string, unknown>).value
    ).toBeUndefined()
    await waitFor(() =>
      expect(storedOptions[0]).toMatchObject({
        value: 'std',
        labelZh: '标准性能版',
        labelEn: '',
      })
    )
    await waitFor(() =>
      expect(performanceVersionTestNotifications.success).toHaveBeenCalledTimes(
        1
      )
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: '再次新增' }))
    await screen.findByRole('textbox', { name: '性能版本名称' })
    fireEvent.change(screen.getByRole('textbox', { name: '性能版本名称' }), {
      target: { value: '第二次修改' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(savedRequests).toHaveLength(2))
    expect(savedRequests[1]).toMatchObject({
      op: 'PATCH',
      metadata: { id: original.id, version: 4 },
      delta: { labelZh: { n: '第二次修改' } },
    })
  })

  it('preserves the draft after a failed save and discards it after closing', async () => {
    vi.mocked(apiFetch).mockImplementation(async (_path, init) => {
      if (init?.method === 'POST') throw new Error('模拟保存失败')
      return []
    })
    renderIndependentBOMPerformanceVersionFlow(
      <ReopenableIndependentPerformanceVersionManagementDialog />
    )
    await screen.findByRole('textbox', { name: '性能版本名称' })
    fireEvent.change(screen.getByRole('textbox', { name: '性能版本名称' }), {
      target: { value: '未保存加强版' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(performanceVersionTestNotifications.error).toHaveBeenCalledWith(
        '模拟保存失败'
      )
    )
    expect(
      (
        screen.getByRole('textbox', {
          name: '性能版本名称',
        }) as HTMLInputElement
      ).value
    ).toBe('未保存加强版')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: '再次新增' }))
    await screen.findByRole('textbox', { name: '性能版本名称' })
    expect(
      (
        screen.getByRole('textbox', {
          name: '性能版本名称',
        }) as HTMLInputElement
      ).value
    ).toBe('')
    expect(savedRequests).toHaveLength(0)
  })

  it('selects versions and adds or resets a draft in the same dialog', async () => {
    storedOptions = [
      createStoredBOMPerformanceVersionOption(),
      {
        ...createStoredBOMPerformanceVersionOption(),
        id: 'reinforced-performance-version',
        value: 'reinforced',
        labelZh: '加强版',
        active: false,
      },
    ]
    renderIndependentBOMPerformanceVersionFlow(
      <BOMPerformanceVersionOptionManagementDialog
        open
        onOpenChange={vi.fn()}
      />
    )
    const standardVersionButton = await screen.findByRole('button', {
      name: '标准版',
    })
    const performanceVersionNameInput = screen.getByRole('textbox', {
      name: '性能版本名称',
    }) as HTMLInputElement
    expect(standardVersionButton.getAttribute('aria-pressed')).toBe('true')
    expect(performanceVersionNameInput.value).toBe('标准版')
    fireEvent.click(screen.getByRole('button', { name: /加强版\s*已停用/ }))
    expect(performanceVersionNameInput.value).toBe('加强版')
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe(
      'false'
    )
    fireEvent.change(performanceVersionNameInput, {
      target: { value: '临时修改' },
    })
    fireEvent.click(screen.getByRole('button', { name: '重置' }))
    expect(performanceVersionNameInput.value).toBe('加强版')
    fireEvent.click(screen.getByRole('button', { name: '添加性能版本选项' }))
    expect(performanceVersionNameInput.value).toBe('')
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull()
    fireEvent.click(standardVersionButton)
    expect(performanceVersionNameInput.value).toBe('标准版')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(savedRequests).toHaveLength(0)
  })

  it('blocks switching, closing and duplicate saves while a save is pending', async () => {
    storedOptions = [createStoredBOMPerformanceVersionOption()]
    const performOriginalRequest = vi.mocked(apiFetch).getMockImplementation()!
    let finishSave!: () => void
    const pendingSave = new Promise<void>((resolve) => {
      finishSave = resolve
    })
    vi.mocked(apiFetch).mockImplementation(async (path, init) => {
      if (init?.method === 'POST') await pendingSave
      return performOriginalRequest(path, init)
    })
    const onOpenChange = vi.fn()
    renderIndependentBOMPerformanceVersionFlow(
      <BOMPerformanceVersionOptionManagementDialog
        open
        onOpenChange={onOpenChange}
      />
    )
    await screen.findByRole('button', { name: '标准版' })
    fireEvent.change(screen.getByRole('textbox', { name: '性能版本名称' }), {
      target: { value: '保存中的修改' },
    })
    const performanceVersionForm = screen
      .getByRole('textbox', { name: '性能版本名称' })
      .closest('form')!
    fireEvent.submit(performanceVersionForm)
    fireEvent.submit(performanceVersionForm)
    await screen.findByRole('button', { name: '保存中…' })
    expect(
      (screen.getByRole('button', { name: '标准版' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
    expect(
      (
        screen.getByRole('button', {
          name: '添加性能版本选项',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    finishSave()
    await waitFor(() =>
      expect(performanceVersionTestNotifications.success).toHaveBeenCalledTimes(
        1
      )
    )
    expect(savedRequests).toHaveLength(1)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('selects a remaining version after deletion and starts a fresh draft when the catalog becomes empty', async () => {
    storedOptions = [
      createStoredBOMPerformanceVersionOption(),
      {
        ...createStoredBOMPerformanceVersionOption(),
        id: 'lightweight-performance-version',
        value: 'lightweight',
        labelZh: '轻量版',
      },
    ]
    renderIndependentBOMPerformanceVersionFlow(
      <BOMPerformanceVersionOptionManagementDialog
        open
        onOpenChange={vi.fn()}
      />
    )
    await screen.findByRole('button', { name: '标准版' })
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: '轻量版' })
          .getAttribute('aria-pressed')
      ).toBe('true')
    )
    expect(screen.queryByRole('button', { name: '标准版' })).toBeNull()
    expect(
      (
        screen.getByRole('textbox', {
          name: '性能版本名称',
        }) as HTMLInputElement
      ).value
    ).toBe('轻量版')
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    await screen.findByRole('heading', { name: '新增性能版本' })
    expect(
      (
        screen.getByRole('textbox', {
          name: '性能版本名称',
        }) as HTMLInputElement
      ).value
    ).toBe('')
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('shows only independent performance versions even if a response also contains product template options', async () => {
    storedOptions = [
      createStoredBOMPerformanceVersionOption(),
      {
        ...createStoredBOMPerformanceVersionOption(),
        id: 'template-owned',
        templateId: 'rim-template',
        labelZh: '模板专属项',
      },
      {
        ...createStoredBOMPerformanceVersionOption(),
        id: 'brake',
        categoryKey: 'brakeType',
        labelZh: '碟刹',
      },
    ]
    renderIndependentBOMPerformanceVersionFlow(
      <BOMProductInformationWithIndependentPerformanceVersionCatalog
        initialBOM={{ productId: 'model-a' }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '管理性能版本选项' }))
    const managementDialog = await screen.findByRole('dialog', {
      name: '性能版本选项',
    })
    expect(await within(managementDialog).findByText('标准版')).toBeTruthy()
    expect(within(managementDialog).queryByText('模板专属项')).toBeNull()
    expect(within(managementDialog).queryByText('碟刹')).toBeNull()
  })

  it('rejects editing or deleting product template attributes through the performance version service', async () => {
    const productOption = {
      ...createStoredBOMPerformanceVersionOption(),
      categoryKey: 'brakeType',
    }
    await expect(
      BOMPerformanceVersionOptionService.savePerformanceVersionOption(
        productOption,
        productOption
      )
    ).rejects.toThrow('该记录不属于 BOM 性能版本选项')
    await expect(
      BOMPerformanceVersionOptionService.deletePerformanceVersionOption(
        productOption
      )
    ).rejects.toThrow('该记录不属于 BOM 性能版本选项')
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

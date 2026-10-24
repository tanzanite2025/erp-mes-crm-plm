// @vitest-environment jsdom
import { useForm } from 'react-hook-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { translate } from '@/locales'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { productSchema } from '@/features/engineering/data/schema'
import { materialOptionSchema } from '@/features/material-archive/data/schema'
import {
  bomSectionConfigSchema,
  bomSectionOptionSchema,
} from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { type BOMFormOptionsResource } from '../hooks/use-bom-form-options'
import {
  createBOMPermissionContext,
  useBOMPermissionGuard,
} from '../hooks/use-bom-permission-guard'
import { useBOMSectionOptions } from '../hooks/use-bom-section-config'
import { useBOMSubmitOrchestrator } from '../hooks/use-bom-submit-orchestrator'
import { type SaveBOMInput } from '../mutation-types'
import {
  createEmptyBOMFormValue,
  createEmptyBOMItem,
} from '../utils/bom-form-defaults'
import { BOMActionDialog } from './bom-action-dialog'

vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({ allowsAction: () => true }),
}))
vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (
      key: Parameters<typeof translate>[1],
      values?: Parameters<typeof translate>[2]
    ) => translate('zh-CN', key, values),
  }),
}))
vi.mock('@/features/basic-settings/hooks/use-units-query', () => ({
  useUnitsQuery: () => ({
    units: [
      { id: 'g', code: 'g', name: '克', category: 'WEIGHT', status: 'active' },
    ],
  }),
}))
vi.mock('@/features/trading/customer', () => ({ getCustomers: async () => [] }))
vi.mock('../hooks/use-bom-form-options', () => ({
  useBOMFormOptions: () => {
    const query = useBOMSectionOptions(referenceResource.status === 'ready')
    return referenceResource.status === 'ready'
      ? {
          ...referenceResource,
          sections: query.data ?? referenceResource.sections,
        }
      : referenceResource
  },
}))
// jsdom has no viewport measurements. Keep the real item rows, calculations and workspace projection.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 136,
        end: (index + 1) * 136,
      })),
    getTotalSize: () => count * 136,
    measureElement: () => undefined,
  }),
}))

let editBOMRecord: BOM | undefined
let referenceResource: BOMFormOptionsResource
let sharedSections: ReturnType<typeof bomSectionConfigSchema.parse>[]
const queryClients: QueryClient[] = []
const initialRecipeItems = [
  {
    ...createEmptyBOMItem('LAYUP'),
    id: 'carbon-item',
    materialId: 'carbon',
    materialName: '碳布',
    unit: 'm2',
    unitPrice: 10,
    unitUsage: 2,
    wastagePercent: 5,
    standardUsage: 2.1,
  },
]

function renderBOMDialogWithProductInformationAndRecipe(
  onSubmit: (
    data: SaveBOMInput
  ) => Promise<ReturnType<typeof createEmptyBOMFormValue>>,
  onPromote = vi.fn(),
  currentRow?: BOM
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClients.push(queryClient)
  render(
    <QueryClientProvider client={queryClient}>
      <BOMActionDialog
        open
        currentRow={currentRow}
        initialProductId='model-a'
        initialItems={initialRecipeItems}
        wizardHeader={<div>产品建档第四步</div>}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        onPromote={onPromote}
      />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  editBOMRecord = undefined
  vi.stubGlobal(
    'ResizeObserver',
    class BOMDialogRegionResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  sharedSections = [
    bomSectionConfigSchema.parse({
      id: 'layup',
      code: 'LAYUP',
      name: '叠层',
      isDefault: true,
      isSystem: true,
    }),
    bomSectionConfigSchema.parse({
      id: 'packing',
      code: 'PACKING',
      name: '包装',
      sortOrder: 10,
    }),
  ]
  referenceResource = {
    status: 'ready',
    products: [
      productSchema.parse({
        id: 'model-a',
        sku: 'R50',
        name: 'R50',
        typeId: 'rim',
        createdAt: '2026-10-23',
      }),
    ],
    productDisplayLabelMap: new Map([['model-a', 'R50']]),
    materials: [
      materialOptionSchema.parse({
        id: 'carbon',
        code: 'C100',
        name: '碳布',
        category: 'RAW_MATERIAL',
        uom: 'm2',
      }),
    ],
    sections: sharedSections.map((section) =>
      bomSectionOptionSchema.parse({
        ...section,
        value: section.code,
        label: section.name,
      })
    ),
    productTemplates: [],
    productTypes: [],
    productAttributeCategories: [],
    productAttributeOptions: [],
  }
  vi.mocked(apiFetch).mockImplementation(async (path, options) => {
    if (editBOMRecord && path === '/engineering/bom/' + editBOMRecord.id)
      return editBOMRecord
    if (path === '/engineering/bom-sections/options')
      return sharedSections.map((section) => ({
        ...section,
        value: section.code,
        label: section.name,
      }))
    if (path === '/engineering/bom-sections')
      return {
        items: sharedSections,
        total: sharedSections.length,
        page: 1,
        pageSize: 50,
      }
    if (
      path.startsWith('/engineering/bom-sections/') &&
      options?.method === 'PATCH'
    ) {
      const sectionId = path.split('/').slice(-1)[0]
      const payload = JSON.parse(options.body as string)
      const section = sharedSections.find((item) => item.id === sectionId)!
      for (const [field, change] of Object.entries(payload.delta) as Array<
        [string, { n: unknown }]
      >) {
        Object.assign(section, { [field]: change.n })
      }
      section.version += 1
      return { ...section }
    }
    if (path.startsWith('/engineering/bom?') || path.endsWith('/usage/stats'))
      return []
    if (path.startsWith('/engineering/product-attribute-options'))
      return [
        {
          id: 'std',
          categoryKey: 'versionLevel',
          value: 'std',
          labelZh: '标准版',
          active: true,
          sortOrder: 0,
          version: 1,
        },
        {
          id: 'lightweight',
          categoryKey: 'versionLevel',
          value: 'lightweight',
          labelZh: '轻量版',
          active: true,
          sortOrder: 10,
          version: 1,
        },
      ]
    throw new Error(`Unexpected BOM dialog dependency: ${path}`)
  })
})

afterEach(() => {
  cleanup()
  queryClients.splice(0).forEach((client) => client.clear())
})

describe('BOM product information, recipe and submit responsibility boundaries', () => {
  it('keeps typed historical date input intact and normalizes it on blur before saving', async () => {
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue({ ...data, id: 'date-bom' })
    )
    renderBOMDialogWithProductInformationAndRecipe(onSubmit)
    const input = await screen.findByRole('textbox', { name: '生效开始' })
    fireEvent.change(input, { target: { value: '1998/1/' } })
    expect(input).toHaveValue('1998/1/')
    fireEvent.change(input, { target: { value: '1998/1/15' } })
    expect(input).toHaveValue('1998/1/15')
    fireEvent.blur(input)
    expect(input).toHaveValue('1998-01-15')
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].effectiveFrom).toBe('1998-01-15')
  })

  it('validates and normalizes a pasted compact date on submit even without blur', async () => {
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue({ ...data, id: 'date-bom' })
    )
    renderBOMDialogWithProductInformationAndRecipe(onSubmit)
    const input = await screen.findByRole('textbox', { name: '生效开始' })
    fireEvent.change(input, { target: { value: '20200229' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].effectiveFrom).toBe('2020-02-29')
  })

  it('blocks invalid dates in both draft save and the save-before-approval path, retaining the entered text', async () => {
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue({ ...data, id: 'date-bom', version: 2 })
    )
    const onPromote = vi.fn(async () => true)
    renderBOMDialogWithProductInformationAndRecipe(onSubmit, onPromote)
    const input = await screen.findByRole('textbox', { name: '生效开始' })
    fireEvent.change(input, { target: { value: '2023-02-29' } })
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('请输入有效日期')
    expect(input).toHaveValue('2023-02-29')
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '提交评审' }))
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onPromote).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '20240229' } })
    fireEvent.click(screen.getByRole('button', { name: '提交评审' }))
    await waitFor(() =>
      expect(onPromote).toHaveBeenCalledWith('date-bom', 'APPROVED', 2)
    )
    expect(onSubmit.mock.calls[0][0].effectiveFrom).toBe('2024-02-29')
  })

  it('preserves real nested parent-child relationships when editing and saving in the accordion', async () => {
    editBOMRecord = createEmptyBOMFormValue({
      id: 'nested-bom',
      productId: 'model-a',
      items: initialRecipeItems,
      relationSidecar: {
        kind: 'parent_children_protocol',
        version: 'v1',
        protocolDraft: {
          rootChildren: ['section:LAYUP'],
          branchNodes: [
            {
              id: 'section:LAYUP',
              parentId: 'root',
              children: ['laminate'],
              nodeKind: 'branch',
              branchRole: 'section',
              label: '叠层',
              sectionCode: 'LAYUP',
            },
            {
              id: 'laminate',
              parentId: 'section:LAYUP',
              children: ['outer-layer'],
              nodeKind: 'branch',
              branchRole: 'collection',
              label: '叠层组件',
              sectionCode: 'LAYUP',
            },
            {
              id: 'outer-layer',
              parentId: 'laminate',
              children: ['item:carbon-item'],
              nodeKind: 'branch',
              branchRole: 'collection',
              label: '外层铺布',
              sectionCode: 'LAYUP',
            },
          ],
          itemNodes: [
            {
              id: 'item:carbon-item',
              itemId: 'carbon-item',
              parentId: 'outer-layer',
              children: [],
              nodeKind: 'item',
              sectionCode: 'LAYUP',
            },
          ],
        },
      },
    })
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue({ ...data, id: 'nested-bom', version: 2 })
    )
    renderBOMDialogWithProductInformationAndRecipe(
      onSubmit,
      vi.fn(),
      editBOMRecord
    )
    const recipe = await screen.findByRole('region', { name: 'BOM 配方明细' })
    await within(recipe).findByRole('button', { name: '外层铺布' })
    await waitFor(() =>
      expect(
        recipe.querySelector<HTMLInputElement>('[name="items.0.unitUsage"]')
          ?.value
      ).toBe('2')
    )
    fireEvent.change(
      recipe.querySelector<HTMLInputElement>('[name="items.0.unitUsage"]')!,
      { target: { value: '4' } }
    )
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const saved = onSubmit.mock.calls[0][0]
    expect(saved.relationSidecar?.protocolDraft.branchNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'laminate',
          parentId: 'section:LAYUP',
          children: ['outer-layer'],
        }),
        expect.objectContaining({
          id: 'outer-layer',
          parentId: 'laminate',
          children: ['item:carbon-item'],
        }),
      ])
    )
    expect(saved.relationSidecar?.protocolDraft.itemNodes).toContainEqual(
      expect.objectContaining({
        id: 'item:carbon-item',
        parentId: 'outer-layer',
      })
    )
    expect(saved.items[0]).toMatchObject({ unitUsage: 4, standardUsage: 4.2 })
  })

  it('keeps a locked BOM recipe read-only while allowing accordion navigation', async () => {
    editBOMRecord = createEmptyBOMFormValue({
      id: 'locked-bom',
      productId: 'model-a',
      isLocked: true,
      status: 'RELEASED',
      items: initialRecipeItems,
      relationSidecar: {
        kind: 'parent_children_protocol',
        version: 'v1',
        protocolDraft: {
          rootChildren: ['section:LAYUP'],
          branchNodes: [
            {
              id: 'section:LAYUP',
              parentId: 'root',
              children: ['item:carbon-item'],
              nodeKind: 'branch',
              branchRole: 'section',
              label: '叠层',
              sectionCode: 'LAYUP',
            },
          ],
          itemNodes: [
            {
              id: 'item:carbon-item',
              itemId: 'carbon-item',
              parentId: 'section:LAYUP',
              children: [],
              nodeKind: 'item',
              sectionCode: 'LAYUP',
            },
          ],
        },
      },
    })
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue(data)
    )
    renderBOMDialogWithProductInformationAndRecipe(
      onSubmit,
      vi.fn(),
      editBOMRecord
    )
    const recipe = await screen.findByRole('region', { name: 'BOM 配方明细' })
    await waitFor(() =>
      expect(
        recipe.querySelector<HTMLInputElement>('[name="items.0.unitUsage"]')
          ?.disabled
      ).toBe(true)
    )
    const layup = within(recipe).getByRole('button', {
      name: '叠层',
    })
    fireEvent.click(layup)
    expect(layup.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(within(recipe).getByRole('button', { name: '包装' }))
    expect(
      (
        within(recipe).getByRole('button', {
          name: '添加包装明细',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    const ownershipHelp = screen.getByRole('button', { name: '查看归属说明' })
    expect(ownershipHelp).toBeEnabled()
    expect(ownershipHelp.closest('label')).toBeNull()
    expect(ownershipHelp).toHaveAttribute('type', 'button')
    fireEvent.click(ownershipHelp)
    const helpPopover = await screen.findByRole('dialog', {
      name: '归属：这份配方供谁使用',
    })
    expect(within(helpPopover).getByText('内部生产')).toBeInTheDocument()
    expect(within(helpPopover).getByText('客户专供')).toBeInTheDocument()
    expect(within(helpPopover).getByText(/归属客户.*留空/)).toBeInTheDocument()
    expect(within(helpPopover).getByText(/选择实际客户/)).toBeInTheDocument()
    fireEvent.keyDown(helpPopover, { key: 'Escape' })
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '归属：这份配方供谁使用' })
      ).not.toBeInTheDocument()
    )
    expect(screen.getByRole('dialog', { name: /BOM/ })).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('edits immediately, folds each group independently and adds material to the clicked non-default group', async () => {
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue({ ...data, id: 'saved-bom' })
    )
    renderBOMDialogWithProductInformationAndRecipe(onSubmit)
    const recipe = await screen.findByRole('region', { name: 'BOM 配方明细' })
    await waitFor(() =>
      expect(recipe.querySelector('[name="items.0.unitUsage"]')).toBeTruthy()
    )
    expect(within(recipe).queryByRole('tablist')).toBeNull()
    const packing = within(recipe).getByRole('button', {
      name: '包装',
    })
    const layup = within(recipe).getByRole('button', {
      name: '叠层',
    })
    expect(layup.getAttribute('aria-expanded')).toBe('true')
    expect(packing.getAttribute('aria-expanded')).toBe('false')
    fireEvent.change(
      recipe.querySelector<HTMLInputElement>('[name="items.0.unitUsage"]')!,
      { target: { value: '4' } }
    )
    fireEvent.click(packing)
    expect(layup.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(
      within(recipe).getByRole('button', { name: '添加包装明细' })
    )
    await waitFor(() =>
      expect(within(recipe).getAllByRole('combobox')).toHaveLength(2)
    )
    const materialSelectors = within(recipe).getAllByRole('combobox')
    fireEvent.click(materialSelectors[materialSelectors.length - 1])
    fireEvent.click(await screen.findByRole('option', { name: /碳布/ }))
    fireEvent.click(layup)
    expect(recipe.querySelector('[name="items.0.unitUsage"]')).toBeNull()
    expect(recipe.querySelector('[name="items.1.unitUsage"]')).toBeTruthy()
    fireEvent.click(layup)
    expect(
      recipe.querySelector<HTMLInputElement>('[name="items.0.unitUsage"]')
        ?.value
    ).toBe('4')
    expect(packing.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      items: [
        { section: 'LAYUP', unitUsage: 4 },
        { section: 'PACKING', materialId: 'carbon' },
      ],
      relationSidecar: {
        protocolDraft: {
          itemNodes: [
            expect.objectContaining({ sectionCode: 'LAYUP' }),
            expect.objectContaining({ sectionCode: 'PACKING' }),
          ],
        },
      },
    })
  })

  it('keeps historical rows visible when their shared group is inactive and hides empty inactive groups', async () => {
    sharedSections[0].active = false
    sharedSections[0].isDefault = false
    sharedSections[1].isDefault = true
    sharedSections.push(
      bomSectionConfigSchema.parse({
        id: 'old',
        code: 'OLD',
        name: '旧分组',
        active: false,
      })
    )
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue({ ...data, id: 'saved-bom' })
    )
    renderBOMDialogWithProductInformationAndRecipe(onSubmit)
    const recipe = await screen.findByRole('region', { name: 'BOM 配方明细' })
    await within(recipe).findByText('已停用')
    await waitFor(() =>
      expect(
        within(recipe).queryByRole('button', { name: '旧分组' })
      ).toBeNull()
    )
    await waitFor(() =>
      expect(
        within(recipe).queryByRole('button', { name: '添加叠层明细' })
      ).toBeNull()
    )
    expect(
      within(recipe)
        .getByRole('button', { name: '叠层' })
        .getAttribute('aria-expanded')
    ).toBe('true')
    expect(
      recipe.querySelector<HTMLInputElement>('[name="items.0.unitUsage"]')
        ?.value
    ).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].items[0]).toMatchObject({
      section: 'LAYUP',
      materialId: 'carbon',
    })
  })

  it('keeps metadata and recipe edits independent and saves both through the existing form', async () => {
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue({ ...data, id: 'saved-bom', version: 2 })
    )
    renderBOMDialogWithProductInformationAndRecipe(onSubmit)
    const information = await screen.findByRole('complementary', {
      name: '产品与 BOM 信息',
    })
    const recipe = screen.getByRole('region', { name: 'BOM 配方明细' })
    expect(screen.getByText('产品建档第四步')).toBeTruthy()
    expect(recipe.querySelector('[name="description"]')).toBeNull()
    fireEvent.change(
      within(information).getByRole('textbox', { name: 'BOM 备注' }),
      { target: { value: '只修改本型号的备注' } }
    )
    expect(within(recipe).queryByRole('tablist')).toBeNull()
    const usageInput = await waitFor(() => {
      const input = recipe.querySelector<HTMLInputElement>(
        '[name="items.0.unitUsage"]'
      )
      expect(input).toBeTruthy()
      return input!
    })
    expect(usageInput.value).toBe('2')
    fireEvent.change(usageInput, { target: { value: '4' } })
    expect(
      (
        within(information).getByRole('textbox', {
          name: 'BOM 备注',
        }) as HTMLTextAreaElement
      ).value
    ).toBe('只修改本型号的备注')
    expect(
      within(information).getByRole('combobox', { name: '产品' }).textContent
    ).toBe('R50')
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      productId: 'model-a',
      description: '只修改本型号的备注',
      status: 'DRAFT',
      items: [
        {
          id: 'carbon-item',
          materialId: 'carbon',
          unitUsage: 4,
          wastagePercent: 5,
          standardUsage: 4.2,
        },
      ],
      relationSidecar: { kind: 'parent_children_protocol', version: 'v1' },
    })
  })

  it.each(['EBOM', 'MBOM'] as const)(
    'publishes the saved locked approved %s without saving its read-only recipe again',
    async (bomType) => {
      editBOMRecord = createEmptyBOMFormValue({
        id: 'approved-bom',
        productId: 'model-a',
        bomType,
        status: 'APPROVED',
        isLocked: true,
        version: 7,
        measuredWeight: 420,
        measuredWeightUnit: 'g',
        items: initialRecipeItems,
        relationSidecar: {
          kind: 'parent_children_protocol',
          version: 'v1',
          protocolDraft: {
            rootChildren: ['section:LAYUP'],
            branchNodes: [
              {
                id: 'section:LAYUP',
                parentId: 'root',
                children: ['item:carbon-item'],
                nodeKind: 'branch',
                branchRole: 'section',
                label: '叠层',
                sectionCode: 'LAYUP',
              },
            ],
            itemNodes: [
              {
                id: 'item:carbon-item',
                itemId: 'carbon-item',
                parentId: 'section:LAYUP',
                children: [],
                nodeKind: 'item',
                sectionCode: 'LAYUP',
              },
            ],
          },
        },
      })
      const onSubmit = vi.fn(async (data: SaveBOMInput) =>
        createEmptyBOMFormValue(data)
      )
      const onPromote = vi.fn(async () => true)
      renderBOMDialogWithProductInformationAndRecipe(
        onSubmit,
        onPromote,
        editBOMRecord
      )
      const releaseButton = await screen.findByRole('button', {
        name: bomType === 'EBOM' ? '发布研发' : '发布生产',
      })
      expect(screen.getByRole('textbox', { name: 'BOM 备注' })).toBeDisabled()
      expect(screen.getByRole('textbox', { name: '生效开始' })).toBeDisabled()
      expect(
        screen.getByRole('button', { name: '选择生效开始日期' })
      ).toBeDisabled()
      await waitFor(() =>
        expect(
          document.querySelector('[name="items.0.unitUsage"]')
        ).toBeDisabled()
      )
      expect(screen.queryByRole('button', { name: '存草稿' })).toBeNull()
      fireEvent.click(releaseButton)
      await waitFor(() =>
        expect(onPromote).toHaveBeenCalledExactlyOnceWith(
          'approved-bom',
          'RELEASED',
          7
        )
      )
      expect(onSubmit).not.toHaveBeenCalled()
    }
  )

  it('publishes only the saved approved version even if the locked form is marked dirty programmatically', async () => {
    const savedBOM = createEmptyBOMFormValue({
      id: 'saved-approved-bom',
      status: 'APPROVED',
      isLocked: true,
      version: 7,
      description: 'Saved approved recipe',
    })
    const onSubmit = vi.fn(async () => savedBOM)
    const onPromote = vi.fn(async () => true)
    const onClose = vi.fn()
    const { result } = renderHook(() => {
      const form = useForm<BOM>({ defaultValues: savedBOM })
      const permissionGuard = useBOMPermissionGuard({
        context: createBOMPermissionContext(savedBOM, true),
      })
      const operations = useBOMSubmitOrchestrator({
        isEdit: true,
        currentRow: savedBOM,
        form,
        effectiveProtocolDraft: {
          rootChildren: [],
          branchNodes: [],
          itemNodes: [],
        },
        isSidecarDirty: false,
        permissionGuard,
        optimisticLock: {
          currentVersion: 7,
          updateVersion: vi.fn(),
          validateVersion: vi.fn(),
          prepareSavePayload: vi.fn(),
        },
        deltaTracker: { commitDelta: vi.fn(), resetBaseline: vi.fn() },
        onSubmit,
        onPromote,
        onClose,
      })
      return { form, operations }
    })
    act(() => {
      result.current.form.setValue('description', 'Unsaved form value', {
        shouldDirty: true,
      })
    })
    expect(result.current.form.formState.isDirty).toBe(true)
    await act(async () => result.current.operations.promote('RELEASED'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onPromote).toHaveBeenCalledExactlyOnceWith(
      'saved-approved-bom',
      'RELEASED',
      7
    )
    expect(onClose).toHaveBeenCalledExactlyOnceWith()
  })

  it('continues to save before promoting from the shared footer without merging lifecycle controls into the information panel', async () => {
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue({ ...data, id: 'saved-bom', version: 2 })
    )
    const onPromote = vi.fn(async () => true)
    renderBOMDialogWithProductInformationAndRecipe(onSubmit, onPromote)
    const information = await screen.findByRole('complementary', {
      name: '产品与 BOM 信息',
    })
    expect(
      within(information).queryByRole('button', { name: '提交评审' })
    ).toBeNull()
    fireEvent.change(
      within(information).getByRole('textbox', { name: 'BOM 备注' }),
      { target: { value: '准备评审' } }
    )
    fireEvent.click(screen.getByRole('button', { name: '提交评审' }))
    await waitFor(() =>
      expect(onPromote).toHaveBeenCalledWith('saved-bom', 'APPROVED', 2)
    )
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      productId: 'model-a',
      description: '准备评审',
      items: initialRecipeItems,
    })
  })

  it('preserves information, recipe edits and each version weight draft across mobile steps without submitting', async () => {
    const onSubmit = vi.fn(async (data: SaveBOMInput) =>
      createEmptyBOMFormValue({ ...data, id: 'saved-bom', version: 2 })
    )
    renderBOMDialogWithProductInformationAndRecipe(onSubmit)
    const information = await screen.findByRole('complementary', {
      name: '产品与 BOM 信息',
    })
    const recipe = screen.getByRole('region', { name: 'BOM 配方明细' })
    const informationStep = screen.getByRole('button', {
      name: '步骤 1：基本信息',
    })
    const recipeStep = screen.getByRole('button', { name: '步骤 2：配方明细' })
    expect(informationStep.getAttribute('aria-current')).toBe('step')
    fireEvent.change(
      within(information).getByRole('textbox', { name: 'BOM 备注' }),
      {
        target: { value: '切换步骤后继续编辑' },
      }
    )
    fireEvent.click(
      within(information).getByRole('button', { name: '管理性能版本选项' })
    )
    let versionDialog = await screen.findByRole('dialog', {
      name: '性能版本选项',
    })
    fireEvent.click(
      await within(versionDialog).findByRole('button', { name: '标准版' })
    )
    fireEvent.change(
      within(versionDialog).getByRole('spinbutton', { name: '本版本重量' }),
      {
        target: { value: '520' },
      }
    )
    fireEvent.click(
      within(versionDialog).getByRole('combobox', { name: '重量单位' })
    )
    fireEvent.click(await screen.findByRole('option', { name: 'g (克)' }))
    fireEvent.click(
      within(versionDialog).getByRole('button', { name: '轻量版' })
    )
    fireEvent.change(
      within(versionDialog).getByRole('spinbutton', { name: '本版本重量' }),
      {
        target: { value: '420' },
      }
    )
    fireEvent.click(
      within(versionDialog).getByRole('combobox', { name: '重量单位' })
    )
    fireEvent.click(await screen.findByRole('option', { name: 'g (克)' }))
    fireEvent.click(
      within(versionDialog).getByRole('button', { name: 'Close' })
    )

    fireEvent.click(recipeStep)
    expect(recipeStep.getAttribute('aria-current')).toBe('step')
    expect(informationStep.hasAttribute('aria-current')).toBe(false)
    expect(within(recipe).queryByRole('tablist')).toBeNull()
    const usageInput = await waitFor(() => {
      const input = recipe.querySelector<HTMLInputElement>(
        '[name="items.0.unitUsage"]'
      )
      expect(input).toBeTruthy()
      return input!
    })
    fireEvent.change(usageInput, { target: { value: '4' } })
    fireEvent.click(
      within(recipe).getByRole('button', { name: '管理共用分组' })
    )
    const sharedGroupDialog = await screen.findByRole('dialog', {
      name: '管理共用分组',
    })
    const sharedGroupEditor = await within(sharedGroupDialog).findByRole(
      'region',
      { name: '共用分组编辑' }
    )
    fireEvent.change(
      within(sharedGroupEditor).getByRole('textbox', { name: '分组名称' }),
      { target: { value: '碳布叠层' } }
    )
    fireEvent.click(
      within(sharedGroupEditor).getByRole('button', { name: '保存配置' })
    )
    await waitFor(() => expect(sharedSections[0].name).toBe('碳布叠层'))
    await waitFor(() =>
      expect(
        (
          within(sharedGroupEditor).getByRole('button', {
            name: '保存配置',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false)
    )
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(
      within(sharedGroupDialog).getByRole('button', { name: 'Close' })
    )
    await within(recipe).findByRole('button', { name: '碳布叠层' })
    expect(
      recipe.querySelector<HTMLInputElement>('[name="items.0.unitUsage"]')
        ?.value
    ).toBe('4')
    fireEvent.click(informationStep)
    expect(
      (
        within(information).getByRole('textbox', {
          name: 'BOM 备注',
        }) as HTMLTextAreaElement
      ).value
    ).toBe('切换步骤后继续编辑')
    expect(
      within(information).getByRole('combobox', { name: '性能版本' })
        .textContent
    ).toContain('轻量版 · 420 g')
    fireEvent.click(
      within(information).getByRole('button', { name: '管理性能版本选项' })
    )
    versionDialog = await screen.findByRole('dialog', { name: '性能版本选项' })
    fireEvent.click(
      within(versionDialog).getByRole('button', { name: '标准版' })
    )
    expect(
      (
        within(versionDialog).getByRole('spinbutton', {
          name: '本版本重量',
        }) as HTMLInputElement
      ).value
    ).toBe('520')
    fireEvent.click(
      within(versionDialog).getByRole('button', { name: '轻量版' })
    )
    expect(
      (
        within(versionDialog).getByRole('spinbutton', {
          name: '本版本重量',
        }) as HTMLInputElement
      ).value
    ).toBe('420')
    fireEvent.click(
      within(versionDialog).getByRole('button', { name: 'Close' })
    )
    fireEvent.click(recipeStep)
    expect(usageInput.isConnected).toBe(true)
    expect(usageInput.value).toBe('4')
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '存草稿' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      description: '切换步骤后继续编辑',
      versionLevel: 'lightweight',
      measuredWeight: 420,
      measuredWeightUnit: 'g',
      items: [{ unitUsage: 4, standardUsage: 4.2 }],
    })
  })
})

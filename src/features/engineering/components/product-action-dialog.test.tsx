// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductActionDialog } from './product-action-dialog'
import { useProductForm } from '../hooks/use-product-form'
import { createProductDraft } from '../utils/default-builders'
import type { ProductTemplate, ProductType } from '../data/schema'

const {
  useProductFormMock,
  useWatchMock,
  productBasicInfoMock,
  dynamicAttributeSectionMock,
  productionRestrictionsMock,
  deleteProductMock,
} = vi.hoisted(() => ({
  useProductFormMock: vi.fn(),
  useWatchMock: vi.fn(),
  productBasicInfoMock: vi.fn(),
  dynamicAttributeSectionMock: vi.fn(),
  productionRestrictionsMock: vi.fn(),
  deleteProductMock: vi.fn(async () => undefined),
}))

vi.mock('react-hook-form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-hook-form')>()
  return {
    ...actual,
    useWatch: useWatchMock,
  }
})

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'engineering.productMgmt.dialog.attributeBindingTemplateLabel') {
        return `Template ${String(params?.name ?? '')}`
      }
      return key
    },
  }),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) => {
    if (!open) return null
    return (
      <div data-testid='dialog-root'>
        <button type='button' onClick={() => onOpenChange(false)}>
          close-dialog
        </button>
        {children}
      </div>
    )
  },
  DialogContent: ({ children }: { children: ReactNode }) => <div data-testid='dialog-content'>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: ReactNode }) => <div data-testid='form-shell'>{children}</div>,
}))

vi.mock('@/components/common/audit-timeline-trigger-button', () => ({
  AuditTimelineTriggerButton: ({ targetId }: { targetId?: string }) => (
    <div data-testid='audit-trigger'>{targetId || 'module-audit'}</div>
  ),
}))

vi.mock('./product/product-basic-info', () => ({
  ProductBasicInfo: (props: unknown) => {
    productBasicInfoMock(props)
    return <div data-testid='product-basic-info' />
  },
}))

vi.mock('./product/dynamic-attribute-section', () => ({
  DynamicAttributeSection: (props: unknown) => {
    dynamicAttributeSectionMock(props)
    return <div data-testid='dynamic-attribute-section' />
  },
}))

vi.mock('./product/production-restrictions', () => ({
  ProductionRestrictions: (props: unknown) => {
    productionRestrictionsMock(props)
    return <div data-testid='production-restrictions' />
  },
}))

vi.mock('../hooks/use-product-form', () => ({
  useProductForm: useProductFormMock,
}))

vi.mock('../hooks/use-product-write-actions', () => ({
  useProductWriteActions: () => ({
    deleteProduct: deleteProductMock,
    isDeletingProduct: false,
  }),
}))

vi.mock('./specs', () => ({
  getLocalizedSpecComponents: vi.fn(() => ({})),
  resolveEffectiveTemplate: vi.fn(async () => null),
}))

vi.mock('../utils/product-create-template-resolution', () => ({
  getCreateProductTemplate: vi.fn(() => null),
}))

const mockedUseProductForm = vi.mocked(useProductForm)

type UseProductFormResult = ReturnType<typeof useProductForm>

function buildFormStub(overrides: Partial<UseProductFormResult['form']> = {}): UseProductFormResult['form'] {
  return {
    control: {},
    handleSubmit: () => (event?: Event) => {
      event?.preventDefault?.()
    },
    setValue: vi.fn(),
    watch: vi.fn((name?: string) => {
      if (name === 'restrictions') return []
      return undefined
    }),
    getValues: vi.fn(() => createProductDraft()),
    ...overrides,
  } as unknown as UseProductFormResult['form']
}

function buildUseProductFormResult(overrides: Partial<UseProductFormResult> = {}): UseProductFormResult {
  const result: UseProductFormResult = {
    form: buildFormStub(),
    isEdit: false,
    dynamicTypes: [],
    attributeCategories: [],
    attributeOptions: [],
    versionLevelOptions: [],
    moldOptions: [],
    specOptions: [],
    metadataInitError: null,
    metadataReady: true,
    nextCodeDeriveError: null,
    skuPreview: '',
    selectedVariants: [],
    boundTemplate: null,
    templateResolveError: null,
    templateResolutionPending: false,
    specPreviewTitle: 'FINAL-PREVIEW-TITLE',
    specPreviewSummary: 'FINAL-PREVIEW',
    specPreviewV2: null,
    handleVariantToggle: vi.fn(),
    updateVariantWeight: vi.fn(),
    handleFormSubmit: vi.fn(),
    ...overrides,
  }

  return result
}

function buildProductTypes(): ProductType[] {
  return [
    {
      id: 'type-a',
      name: 'Type A',
      code: 'TA',
      active: true,
      sortOrder: 0,
      version: 1,
    },
  ]
}

function renderDialog(options?: {
  props?: Partial<React.ComponentProps<typeof ProductActionDialog>>
  hookResult?: Partial<UseProductFormResult>
}) {
  const onOpenChange = options?.props?.onOpenChange ?? vi.fn()
  const onSubmit = options?.props?.onSubmit ?? vi.fn()
  const productTypes = options?.props?.productTypes ?? buildProductTypes()
  const currentRow = options?.props?.currentRow
  const hookResult = buildUseProductFormResult(options?.hookResult)

  mockedUseProductForm.mockReturnValue(hookResult)

  render(
    <ProductActionDialog
      open={options?.props?.open ?? true}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      currentRow={currentRow}
      productTypes={productTypes}
    />
  )

  return {
    onOpenChange,
    onSubmit,
    productTypes,
    currentRow,
    hookResult,
  }
}

describe('ProductActionDialog', () => {
  beforeEach(() => {
    mockedUseProductForm.mockReset()
    productBasicInfoMock.mockReset()
    dynamicAttributeSectionMock.mockReset()
    productionRestrictionsMock.mockReset()
    deleteProductMock.mockClear()
    useWatchMock.mockImplementation(({ name }: { name?: string }) => {
      if (name === 'modelCode') return '01'
      return undefined
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('assembles useProductForm state into child boundaries and footer preview', () => {
    const form = buildFormStub()
    const productTypes = buildProductTypes()
    const dynamicTypes = [{ ...productTypes[0], id: 'type-child', name: 'Type Child' }]
    const { onOpenChange, onSubmit } = renderDialog({
      props: { productTypes },
      hookResult: {
        form,
        dynamicTypes,
        specPreviewSummary: 'RIM-700C-V1',
        specOptions: [{ label: 'Spec A', value: 'spec-a' }],
        moldOptions: [{ label: 'Mold A', value: 'mold-a' }],
      },
    })

    expect(mockedUseProductForm).toHaveBeenCalledWith({
      currentRow: undefined,
      open: true,
      productTypes,
      onOpenChange,
      onSubmit,
    })

    expect(productBasicInfoMock).toHaveBeenCalledWith(expect.objectContaining({
      form,
      dynamicTypes,
      productTypes,
      isEdit: false,
      specOptions: [{ label: 'Spec A', value: 'spec-a' }],
      moldOptions: [{ label: 'Mold A', value: 'mold-a' }],
      templateLabel: undefined,
    }))

    expect(dynamicAttributeSectionMock).toHaveBeenCalledWith(expect.objectContaining({
      form,
      bindings: [],
    }))

    expect(productionRestrictionsMock).toHaveBeenCalledWith(expect.objectContaining({
      restrictions: [],
    }))

    expect(screen.getByText('engineering.productMgmt.dialog.previewTitle')).toBeTruthy()
    expect(screen.getByText('RIM-700C-V1')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'engineering.productMgmt.dialog.saveStandard' })).toHaveProperty('disabled', false)
  })

  it('uses resolved template attribute bindings for dynamic attributes when product type bindings are missing', async () => {
    const form = buildFormStub()
    const templateAttributeBindings = [
      {
        id: 'template-binding-series',
        templateId: 'template-rim',
        categoryKey: 'techSeries',
        required: true,
        active: true,
        sortOrder: 0,
        version: 1,
      },
      {
        id: 'template-binding-tire',
        templateId: 'template-rim',
        categoryKey: 'tireType',
        required: true,
        active: true,
        sortOrder: 1,
        version: 1,
      },
      {
        id: 'template-binding-brake',
        templateId: 'template-rim',
        categoryKey: 'brakeType',
        required: true,
        active: true,
        sortOrder: 2,
        version: 1,
      },
      {
        id: 'template-binding-version',
        templateId: 'template-rim',
        categoryKey: 'versionLevel',
        required: true,
        active: true,
        sortOrder: 3,
        version: 1,
      },
    ]
    const templates: ProductTemplate[] = [
      {
        id: 'template-rim',
        name: '车圈规格',
        code: 'RIM_TEMPLATE',
        componentKey: 'RIM',
        description: '',
        active: true,
        attributeBindings: templateAttributeBindings,
        createdAt: '2026-04-29T00:00:00.000Z',
        version: 1,
      },
    ]

    renderDialog({
      props: {
        currentRow: {
          ...createProductDraft(),
          id: 'product-r50',
          typeId: 'type-a',
          resolvedTemplateId: 'template-rim',
          resolvedTemplateKey: 'RIM',
          templateResolutionSource: 'backendResolvedTemplate',
        },
      },
      hookResult: {
        form,
        isEdit: true,
        boundTemplate: templates[0],
      },
    })

    await waitFor(() => {
      expect(dynamicAttributeSectionMock).toHaveBeenLastCalledWith(expect.objectContaining({
        form,
        bindings: templateAttributeBindings,
      }))
    })
  })

  it('uses backend template resolution as the only authority in create mode', async () => {
    const form = buildFormStub()
    const templateAttributeBindings = [
      {
        id: 'template-binding-version',
        templateId: 'template-rim',
        categoryKey: 'versionLevel',
        required: true,
        active: true,
        sortOrder: 0,
        version: 1,
      },
    ]
    const templates: ProductTemplate[] = [
      {
        id: 'template-rim',
        name: '车圈规格',
        code: 'RIM_TEMPLATE',
        componentKey: 'RIM',
        description: '',
        active: true,
        attributeBindings: templateAttributeBindings,
        createdAt: '2026-04-29T00:00:00.000Z',
        version: 1,
      },
    ]

    renderDialog({
      props: {
        productTypes: [],
      },
      hookResult: {
        form,
        isEdit: false,
        boundTemplate: templates[0],
      },
    })

    await waitFor(() => {
      expect(dynamicAttributeSectionMock).toHaveBeenLastCalledWith(expect.objectContaining({
        form,
        bindings: templateAttributeBindings,
      }))
    })
  })

  it('renders template-driven v2 preview badges when authority template resolves', async () => {
    const form = buildFormStub()

    renderDialog({
      props: {
        productTypes: [],
      },
      hookResult: {
        form,
        isEdit: false,
        specPreviewTitle: 'Road Rim',
        specPreviewSummary: 'Road Rim (normal/UNKNOWN/std)',
        specPreviewV2: {
          title: 'Road Rim',
          code: 'RR-01',
          summaryItems: [
            {
              key: 'techseries',
              label: '工艺系列',
              value: '高刚性',
              empty: false,
            },
            {
              key: 'versionlevel',
              label: '版本等级',
              value: '加强版',
              empty: false,
            },
          ],
          summaryText: '高刚性 / 加强版',
          fullLabel: 'Road Rim (高刚性 / 加强版)',
          strategyVersion: 'product-display-v2',
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Road Rim')).toBeTruthy()
      expect(screen.getByText('工艺系列: 高刚性')).toBeTruthy()
      expect(screen.getByText('版本等级: 加强版')).toBeTruthy()
    })
  })

  it('blocks save when authority cannot resolve a template in create mode', async () => {
    const form = buildFormStub()

    renderDialog({
      props: {
        productTypes: [],
      },
      hookResult: {
        form,
        isEdit: false,
        templateResolveError: 'Template binding resolution failed: missing binding',
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'engineering.productMgmt.dialog.saveStandard' })).toHaveProperty('disabled', true)
      expect(screen.getByText(/Template binding resolution failed:/)).toBeTruthy()
    })
  })

  it('keeps shell behavior stable across rerender and only forwards explicit dialog close', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const form = buildFormStub()
    const hookResult = buildUseProductFormResult({
      form,
      selectedVariants: [{ level: 'V1', weight: undefined }],
      specPreviewSummary: 'PREVIEW-STABLE',
    })
    mockedUseProductForm.mockReturnValue(hookResult)

    const productTypes = buildProductTypes()
    const { rerender } = render(
      <ProductActionDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={vi.fn()}
        productTypes={productTypes}
      />
    )

    rerender(
      <ProductActionDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={vi.fn()}
        productTypes={productTypes}
      />
    )

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(productBasicInfoMock).toHaveBeenCalledTimes(2)
    expect(productBasicInfoMock.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ form }))
    expect(productBasicInfoMock.mock.calls[1]?.[0]).toEqual(expect.objectContaining({ form }))
    expect(screen.getByText('PREVIEW-STABLE')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'engineering.productMgmt.dialog.saveStandard' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'close-dialog' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('maps hook blocking states to the save button without introducing extra state sources', () => {
    renderDialog({
      hookResult: {
        metadataInitError: 'metadata broken',
        nextCodeDeriveError: 'issuer broken',
      },
    })

    expect(screen.getByRole('button', { name: 'engineering.productMgmt.dialog.saveStandard' })).toHaveProperty('disabled', true)
    expect(screen.getByText('engineering.productMgmt.metadata.errorTitle')).toBeTruthy()
    expect(screen.getByText('issuer broken')).toBeTruthy()
  })
})

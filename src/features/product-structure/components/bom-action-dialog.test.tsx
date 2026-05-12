// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOMActionDialog } from './bom-action-dialog'
import { useBOMForm } from '../hooks/use-bom-form'

const {
  useBOMFormMock,
  bomFormHeaderMock,
  bomRecipeEditorMock,
  failLoudlyMock,
} = vi.hoisted(() => ({
  useBOMFormMock: vi.fn(),
  bomFormHeaderMock: vi.fn(),
  bomRecipeEditorMock: vi.fn(),
  failLoudlyMock: vi.fn(),
}))

vi.mock('@/lib/safe-catch', () => ({
  failLoudly: failLoudlyMock,
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/common/audit-timeline-trigger-button', () => ({
  AuditTimelineTriggerButton: () => <div data-testid='audit-timeline-trigger' />,
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
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: ReactNode }) => <div data-testid='form-shell'>{children}</div>,
  FormControl: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FormField: ({ render }: { render: (params: { field: Record<string, unknown> }) => ReactNode }) =>
    render({ field: { value: '', onChange: vi.fn(), onBlur: vi.fn(), name: 'description', ref: vi.fn() } }),
  FormItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('../hooks/use-bom-form', () => ({
  useBOMForm: useBOMFormMock,
}))

vi.mock('./bom-editor/bom-form-header', () => ({
  BOMFormHeader: (props: unknown) => {
    bomFormHeaderMock(props)
    return <div data-testid='bom-form-header' />
  },
}))

vi.mock('./bom-editor/bom-workspace', () => ({
  BOMWorkspace: (props: unknown) => {
    bomRecipeEditorMock(props)
    return <div data-testid='bom-recipe-editor' />
  },
}))

type UseBOMFormResult = ReturnType<typeof useBOMForm>

const mockedUseBOMForm = vi.mocked(useBOMForm)

function buildFormStub(options?: { isDirty?: boolean; submitData?: Record<string, unknown> }) {
  const submitData = options?.submitData ?? {}
  return {
    control: {},
    formState: {
      isDirty: options?.isDirty ?? false,
    },
    handleSubmit:
      (handler: (data: Record<string, unknown>) => void | Promise<void>) =>
      async (event?: { preventDefault?: () => void }) => {
        event?.preventDefault?.()
        await handler(submitData)
      },
  }
}

function buildUseBOMFormResult(overrides: Partial<UseBOMFormResult> = {}): UseBOMFormResult {
  return {
    form: buildFormStub() as UseBOMFormResult['form'],
    fields: [],
    append: vi.fn(),
    remove: vi.fn(),
    optionsResource: {
      status: 'ready',
      products: [],
      productDisplayLabelMap: new Map<string, string>(),
      materials: [],
      sections: [],
      productTemplates: [],
      productTypes: [],
      productAttributeCategories: [],
      productAttributeOptions: [],
    },
    detailSourceResource: undefined,
    protocolDraft: undefined,
    products: [{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }],
    productDisplayLabelMap: new Map([['product-1', 'Product A (高刚性)']]),
    materials: [{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }],
    sections: [{ value: 'PREPARE', label: '备料', code: 'PREPARE', name: '备料', active: true, sortOrder: 1, isDefault: true, legacyNames: ['备料'] }],
    ...overrides,
  } as UseBOMFormResult
}

describe('BOMActionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders form header and recipe editor when options resource is ready', () => {
    mockedUseBOMForm.mockReturnValue(buildUseBOMFormResult({
      protocolDraft: {
        rootChildren: ['section:PREPARE'],
        branchNodes: [],
        itemNodes: [],
      },
    }))

    render(<BOMActionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(bomFormHeaderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        products: expect.arrayContaining([expect.objectContaining({ id: 'product-1' })]),
        productDisplayLabelMap: expect.any(Map),
        isEdit: false,
      })
    )
    expect(bomRecipeEditorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        materials: expect.arrayContaining([expect.objectContaining({ id: 'mat-1' })]),
        protocolDraft: expect.objectContaining({
          rootChildren: ['section:PREPARE'],
        }),
      })
    )
    expect(screen.getByTestId('bom-form-header')).toBeTruthy()
    expect(screen.getByTestId('bom-recipe-editor')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'engineering.bomArchive.dialog.saveDraft' })).toBeTruthy()
  })

  it('renders loading shell instead of form body when options resource is loading', () => {
    mockedUseBOMForm.mockReturnValue(
      buildUseBOMFormResult({
        optionsResource: { status: 'loading' },
        products: [],
        productDisplayLabelMap: new Map<string, string>(),
        materials: [],
        sections: [],
      })
    )

    render(<BOMActionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByText('engineering.bomArchive.header.title')).toBeTruthy()
    expect(screen.getByText('engineering.bomArchive.toasts.loadFailed')).toBeTruthy()
    expect(screen.queryByTestId('bom-form-header')).toBeNull()
    expect(screen.queryByTestId('bom-recipe-editor')).toBeNull()
    expect(bomFormHeaderMock).not.toHaveBeenCalled()
    expect(bomRecipeEditorMock).not.toHaveBeenCalled()
  })

  it('renders explicit error state instead of empty form when options resource fails', () => {
    mockedUseBOMForm.mockReturnValue(
      buildUseBOMFormResult({
        optionsResource: {
          status: 'error',
          error: new Error('BOM options failed'),
          scope: 'useBOMFormOptions.materials',
        },
        products: [],
        productDisplayLabelMap: new Map<string, string>(),
        materials: [],
        sections: [],
      })
    )

    render(<BOMActionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByText('engineering.bomArchive.toasts.loadFailed')).toBeTruthy()
    expect(screen.getByText('BOM options failed')).toBeTruthy()
    expect(screen.queryByTestId('bom-form-header')).toBeNull()
    expect(screen.queryByTestId('bom-recipe-editor')).toBeNull()
  })

  it('forwards Dialog onOpenChange(false) to the outer handler', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    mockedUseBOMForm.mockReturnValue(buildUseBOMFormResult())

    render(<BOMActionDialog open onOpenChange={onOpenChange} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'close-dialog' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('skips submit when edit form stays unchanged', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn()

    mockedUseBOMForm.mockReturnValue(
      buildUseBOMFormResult({
        form: buildFormStub({ isDirty: false }) as UseBOMFormResult['form'],
      })
    )

    render(
      <BOMActionDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        currentRow={{ id: 'bom-1', bomNo: 'BOM-001' } as never}
      />
    )

    await user.click(screen.getByRole('button', { name: 'engineering.bomArchive.dialog.saveDraft' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('includes relationSidecar when dirty create submit succeeds', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => ({ id: 'bom-new-1', bomNo: 'BOM-NEW-001', bomType: 'EBOM', productId: 'product-1', bomVersion: 'V1.0', status: 'DRAFT', isLocked: false } as any))

    mockedUseBOMForm.mockReturnValue(
      buildUseBOMFormResult({
        protocolDraft: {
          rootChildren: ['branch:prepare'],
          branchNodes: [],
          itemNodes: [],
        },
        form: buildFormStub({ isDirty: true, submitData: { bomNo: 'BOM-NEW-001' } }) as UseBOMFormResult['form'],
      })
    )

    render(<BOMActionDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'engineering.bomArchive.dialog.saveDraft' }))

    expect(onSubmit).toHaveBeenCalledWith({
      bomNo: 'BOM-NEW-001',
      relationSidecar: {
        kind: 'parent_children_protocol',
        version: 'v1',
        protocolDraft: {
          rootChildren: ['branch:prepare'],
          branchNodes: [],
          itemNodes: [],
        },
      },
    })
  })

  it('does not auto-close after dirty submit and leaves close control to parent', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn(async () => ({ id: 'bom-1', bomNo: 'BOM-001', bomType: 'EBOM', productId: 'product-1', bomVersion: 'V1.0', status: 'DRAFT', isLocked: false } as any))

    mockedUseBOMForm.mockReturnValue(
      buildUseBOMFormResult({
        protocolDraft: {
          rootChildren: ['branch:prepare'],
          branchNodes: [],
          itemNodes: [],
        },
        form: buildFormStub({ isDirty: true, submitData: { bomNo: 'BOM-001' } }) as UseBOMFormResult['form'],
      })
    )

    render(
      <BOMActionDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        currentRow={{ id: 'bom-1', bomNo: 'BOM-001' } as never}
      />
    )

    await user.click(screen.getByRole('button', { name: 'engineering.bomArchive.dialog.saveDraft' }))

    expect(onSubmit).toHaveBeenCalledWith({
      bomNo: 'BOM-001',
      relationSidecar: {
        kind: 'parent_children_protocol',
        version: 'v1',
        protocolDraft: {
          rootChildren: ['branch:prepare'],
          branchNodes: [],
          itemNodes: [],
        },
      },
    })
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('fails loudly and blocks create submit when effective protocol draft is missing', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn()

    mockedUseBOMForm.mockReturnValue(
      buildUseBOMFormResult({
        protocolDraft: undefined,
        form: buildFormStub({ isDirty: true, submitData: { bomNo: 'BOM-NEW-001' } }) as UseBOMFormResult['form'],
      })
    )

    render(
      <BOMActionDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    )

    await user.click(screen.getByRole('button', { name: 'engineering.bomArchive.dialog.saveDraft' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(failLoudlyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '[CRITICAL] Missing effective BOM relation sidecar protocol draft during save submit',
      }),
      'BOMActionDialog.handleFormSubmit'
    )
  })

  it('fails loudly and blocks edit submit when effective protocol draft is missing', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn()

    mockedUseBOMForm.mockReturnValue(
      buildUseBOMFormResult({
        protocolDraft: undefined,
        form: buildFormStub({ isDirty: true, submitData: { bomNo: 'BOM-001' } }) as UseBOMFormResult['form'],
      })
    )

    render(
      <BOMActionDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        currentRow={{ id: 'bom-1', bomNo: 'BOM-001' } as never}
      />
    )

    await user.click(screen.getByRole('button', { name: 'engineering.bomArchive.dialog.saveDraft' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(failLoudlyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '[CRITICAL] Missing effective BOM relation sidecar protocol draft during save submit',
      }),
      'BOMActionDialog.handleFormSubmit'
    )
  })
})

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
} = vi.hoisted(() => ({
  useBOMFormMock: vi.fn(),
  bomFormHeaderMock: vi.fn(),
  bomRecipeEditorMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string) => key,
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
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: ReactNode }) => <div data-testid='form-shell'>{children}</div>,
  FormControl: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FormField: ({ render }: { render: (params: { field: Record<string, unknown> }) => ReactNode }) => render({ field: { value: '', onChange: vi.fn(), onBlur: vi.fn(), name: 'description', ref: vi.fn() } }),
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

vi.mock('./bom-editor/bom-recipe-editor', () => ({
  BOMRecipeEditor: (props: unknown) => {
    bomRecipeEditorMock(props)
    return <div data-testid='bom-recipe-editor' />
  },
}))

type UseBOMFormResult = ReturnType<typeof useBOMForm>

const mockedUseBOMForm = vi.mocked(useBOMForm)

function buildFormStub() {
  return {
    control: {},
    handleSubmit: (handler: (data: Record<string, unknown>) => void | Promise<void>) => async (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.()
      await handler({})
    },
  }
}

function buildUseBOMFormResult(overrides: Partial<UseBOMFormResult> = {}): UseBOMFormResult {
  return {
    form: buildFormStub() as UseBOMFormResult['form'],
    deltaProxy: {},
    commitDelta: vi.fn(() => undefined),
    isDeltaDirty: false,
    fields: [],
    append: vi.fn(),
    remove: vi.fn(),
    optionsResource: { status: 'ready', products: [], materials: [] },
    products: [{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }],
    materials: [{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }],
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
    mockedUseBOMForm.mockReturnValue(buildUseBOMFormResult())

    render(<BOMActionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(bomFormHeaderMock).toHaveBeenCalledWith(expect.objectContaining({
      products: expect.arrayContaining([expect.objectContaining({ id: 'product-1' })]),
      isEdit: false,
    }))
    expect(bomRecipeEditorMock).toHaveBeenCalledWith(expect.objectContaining({
      materials: expect.arrayContaining([expect.objectContaining({ id: 'mat-1' })]),
    }))
    expect(screen.getByTestId('bom-form-header')).toBeTruthy()
    expect(screen.getByTestId('bom-recipe-editor')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'engineering.bomArchive.dialog.save' })).toBeTruthy()
  })

  it('renders loading shell instead of form body when options resource is loading', () => {
    mockedUseBOMForm.mockReturnValue(buildUseBOMFormResult({
      optionsResource: { status: 'loading' },
      products: [],
      materials: [],
    }))

    render(<BOMActionDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

    expect(screen.getByText('engineering.bomArchive.header.title')).toBeTruthy()
    expect(screen.getByText('engineering.bomArchive.toasts.loadFailed')).toBeTruthy()
    expect(screen.queryByTestId('bom-form-header')).toBeNull()
    expect(screen.queryByTestId('bom-recipe-editor')).toBeNull()
    expect(bomFormHeaderMock).not.toHaveBeenCalled()
    expect(bomRecipeEditorMock).not.toHaveBeenCalled()
  })

  it('renders explicit error state instead of empty form when options resource fails', () => {
    mockedUseBOMForm.mockReturnValue(buildUseBOMFormResult({
      optionsResource: {
        status: 'error',
        error: new Error('BOM options failed'),
        scope: 'useBOMFormOptions.materials',
      },
      products: [],
      materials: [],
    }))

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
})

// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MaterialAssemblyRuleDialog } from './material-assembly-rule-dialog'
import type { MaterialOption } from '../data/schema'
import type { PackagingRuleDraft } from '../utils/packaging-rule-draft'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'materialArchive.assemblyManager.dialog.currentRelation') {
        return `RELATION:${String(params?.relation ?? '')}`
      }
      return key
    },
  }),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => {
    if (!open) return null
    return <div role='dialog'>{children}</div>
  },
  DialogContent: ({ children }: { children: ReactNode }) => <div data-testid='dialog-content'>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: ({ placeholder, className }: { placeholder?: string; className?: string }) => (
    <input aria-label='command-input' placeholder={placeholder} className={className} />
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandItem: ({
    children,
    onSelect,
    value,
  }: {
    children: ReactNode
    onSelect?: (value: string) => void
    value?: string
  }) => (
    <button type='button' onClick={() => onSelect?.(value ?? '')}>
      {children}
    </button>
  ),
}))

function buildMaterial(partial: Partial<MaterialOption> = {}): MaterialOption {
  return {
    id: partial.id ?? 'mat-1',
    code: partial.code ?? 'PK-001',
    name: partial.name ?? '纸箱',
    category: partial.category ?? 'PACKAGING',
    spec: partial.spec,
    uom: partial.uom ?? 'PCS',
    status: partial.status ?? 'Active',
    costPrice: partial.costPrice,
  }
}

function buildDraft(overrides: Partial<PackagingRuleDraft> = {}): PackagingRuleDraft {
  return {
    materialId: 'mat-1',
    packUnit: 'BOX',
    baseUnit: 'PCS',
    conversionFactor: 12,
    direction: 'forward',
    ...overrides,
  }
}

function renderDialog(options?: {
  draft?: PackagingRuleDraft | null
  selectedMaterial?: MaterialOption | null
  materialOptions?: MaterialOption[]
}) {
  const onOpenChange = vi.fn()
  const onComboboxOpenChange = vi.fn()
  const onSelectMaterial = vi.fn()
  const onPackUnitChange = vi.fn()
  const onFactorChange = vi.fn()
  const onToggleDirection = vi.fn()
  const onCancel = vi.fn()
  const onConfirm = vi.fn()

  render(
    <MaterialAssemblyRuleDialog
      open
      onOpenChange={onOpenChange}
      isComboboxOpen
      onComboboxOpenChange={onComboboxOpenChange}
      editingRule={options?.draft ?? buildDraft()}
      selectedMaterial={options?.selectedMaterial ?? null}
      materialOptions={options?.materialOptions ?? [buildMaterial(), buildMaterial({ id: 'mat-2', code: 'PK-002', name: '托盘', uom: 'KG' })]}
      onSelectMaterial={onSelectMaterial}
      onPackUnitChange={onPackUnitChange}
      onFactorChange={onFactorChange}
      onToggleDirection={onToggleDirection}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isSubmitting={false}
    />
  )

  return {
    onOpenChange,
    onComboboxOpenChange,
    onSelectMaterial,
    onPackUnitChange,
    onFactorChange,
    onToggleDirection,
    onCancel,
    onConfirm,
  }
}

describe('MaterialAssemblyRuleDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the dialog shell, placeholder, and footer actions', () => {
    renderDialog({
      draft: buildDraft({ materialId: undefined, baseUnit: '', packUnit: '' }),
      selectedMaterial: null,
    })

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('materialArchive.assemblyManager.dialog.title')).toBeTruthy()
    expect(screen.getByText('materialArchive.assemblyManager.dialog.description')).toBeTruthy()
    expect(screen.getByText('materialArchive.assemblyManager.dialog.materialPlaceholder')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'materialArchive.assemblyManager.dialog.cancel' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'materialArchive.assemblyManager.dialog.confirm' })).toBeTruthy()
  })

  it('renders selected material details and preview relation from the draft', () => {
    renderDialog({
      selectedMaterial: buildMaterial(),
      draft: buildDraft(),
    })

    expect(screen.getByText('纸箱 (PK-001)')).toBeTruthy()
    expect(screen.getByDisplayValue('BOX')).toBeTruthy()
    expect(screen.getByDisplayValue('PCS')).toBeTruthy()
    expect(screen.getByDisplayValue('12')).toBeTruthy()
    expect(screen.getByText('1 BOX')).toBeTruthy()
    expect(screen.getByText('12 PCS')).toBeTruthy()
    expect(screen.getByText('RELATION:1 BOX = 12 PCS')).toBeTruthy()
  })

  it('renders reverse preview when the draft direction is reverse', () => {
    renderDialog({
      selectedMaterial: buildMaterial(),
      draft: buildDraft({ direction: 'reverse' }),
    })

    expect(screen.getByText('1 PCS')).toBeTruthy()
    expect(screen.getByText('12 BOX')).toBeTruthy()
    expect(screen.getByText('RELATION:1 PCS = 12 BOX')).toBeTruthy()
  })

  it('forwards pack unit, factor, direction, cancel, and confirm interactions', async () => {
    const user = userEvent.setup()
    const { onPackUnitChange, onFactorChange, onToggleDirection, onCancel, onConfirm } = renderDialog({
      selectedMaterial: buildMaterial(),
      draft: buildDraft(),
    })

    fireEvent.change(
      screen.getByPlaceholderText('materialArchive.assemblyManager.dialog.packUnitPlaceholder'),
      {
        target: { value: 'BAG' },
      }
    )
    expect(onPackUnitChange).toHaveBeenLastCalledWith('BAG')

    fireEvent.change(screen.getByDisplayValue('12'), {
      target: { value: '24' },
    })
    expect(onFactorChange).toHaveBeenLastCalledWith('24')

    await user.click(screen.getByRole('button', { name: 'materialArchive.assemblyManager.dialog.switchDirection' }))
    expect(onToggleDirection).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'materialArchive.assemblyManager.dialog.cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'materialArchive.assemblyManager.dialog.confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('forwards material selection from the combobox list', async () => {
    const user = userEvent.setup()
    const material = buildMaterial({ id: 'mat-2', code: 'PK-002', name: '托盘', uom: 'KG' })
    const { onSelectMaterial } = renderDialog({
      selectedMaterial: null,
      materialOptions: [material],
    })

    await user.click(screen.getByRole('button', { name: /托盘/i }))

    expect(onSelectMaterial).toHaveBeenCalledWith(material)
  })
})

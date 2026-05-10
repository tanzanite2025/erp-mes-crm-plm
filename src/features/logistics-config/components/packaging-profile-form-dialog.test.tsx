// @vitest-environment jsdom

import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { PackagingProfileFormDialog } from './packaging-profile-form-dialog'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )

  Element.prototype.scrollIntoView = vi.fn()
})

const baseProps: ComponentProps<typeof PackagingProfileFormDialog> = {
  open: true,
  draft: {
    id: undefined,
    code: '',
    name: '',
    packagingType: 'BOX',
    length: 0,
    width: 0,
    height: 0,
    dimensionUnitCode: 'cm',
    netWeight: 0,
    grossWeight: 0,
    weightUnitCode: 'kg',
    capacity: 0,
    capacityUnitCode: 'pcs',
    assemblySource: 'manual',
    isActive: true,
    notes: '',
    targets: [
      {
        id: undefined,
        packagingProfileId: '',
        entityType: 'product',
        entityId: 'product-1',
        entityCode: '',
        entityName: '',
        spec: '',
        isDefault: false,
        sortOrder: 0,
      },
    ],
  },
  products: [
    {
      id: 'product-1',
      sku: 'SKU-1',
      name: 'Product A',
      weight: 10,
    } as never,
  ],
  packagingMaterials: [],
  packagingMaterialOptions: [
    {
      value: 'material-1',
      label: '包装盒 A',
      secondaryLabel: '规格 A',
      tertiaryLabel: 'MAT-001',
    },
  ],
  dimensionUnits: [
    { code: 'cm', name: '厘米' } as never,
  ],
  weightUnits: [
    { code: 'kg', name: '千克' } as never,
  ],
  quantityUnits: [
    { code: 'pcs', name: '件' } as never,
  ],
  resolvedDimensionUnitCode: 'cm',
  resolvedWeightUnitCode: 'kg',
  resolvedCapacityUnitCode: 'pcs',
  selectedPackagingMaterialId: '',
  selectedProduct: { id: 'product-1', sku: 'SKU-1', name: 'Product A', weight: 10 } as never,
  computedVolume: 0,
  computedGrossWeight: 0,
  savePending: false,
  packagingMaterialsLoading: false,
  onOpenChange: vi.fn(),
  onDraftChange: vi.fn(),
  onPackagingMaterialChange: vi.fn(),
  onProductChange: vi.fn(),
  onDimensionUnitChange: vi.fn(),
  onWeightUnitChange: vi.fn(),
  onCapacityUnitChange: vi.fn(),
  onSave: vi.fn(),
}

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
  }),
}))

describe('PackagingProfileFormDialog', () => {
  it('uses full dialog width and keeps the identity section at four columns max', () => {
    render(<PackagingProfileFormDialog {...baseProps} />)

    const dialogContent = document.querySelector('[data-slot="dialog-content"]')
    expect(dialogContent?.className).toContain('w-[min(1360px,calc(100vw-2rem))]')
    expect(dialogContent?.className).toContain('max-w-[calc(100%-2rem)]')

    const identitySection = screen.getByText('基础信息').closest('section')
    const identityGrid = identitySection?.querySelector("div[class*='2xl:grid-cols-4']")
    expect(identityGrid).not.toBeNull()
  })

  it('applies dialog-specific combobox typography classes to the dropdown content', () => {
    render(<PackagingProfileFormDialog {...baseProps} />)

    const [packagingMaterialCombobox] = screen.getAllByRole('combobox')
    fireEvent.click(packagingMaterialCombobox)

    const popoverContent = document.querySelector('[data-slot="popover-content"]')
    expect(popoverContent?.className).toContain('[&_[data-slot=combobox-option-label]]:text-[11px]')
    expect(popoverContent?.className).toContain('[&_[data-slot=combobox-option-secondary-text]]:text-[9px]')
  })
})

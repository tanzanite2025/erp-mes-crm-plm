// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesOrder } from '../../data/schema'

const { handleCreateMock, mutateAsyncMock, useSalesOrderPackagingEntryMock } = vi.hoisted(() => ({
  handleCreateMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  useSalesOrderPackagingEntryMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
  }),
}))

vi.mock('../../hooks/use-sales-order-packaging-entry', () => ({
  useSalesOrderPackagingEntry: useSalesOrderPackagingEntryMock,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: { user: { id: string; accountNo: string } }) => unknown) =>
    selector({ user: { id: 'user-1', accountNo: 'tester' } }),
}))

vi.mock('../../sales', () => ({
  useSalesOrderMutations: () => ({
    lineContentChangeMutation: {
      mutateAsync: mutateAsyncMock,
      isPending: false,
    },
  }),
}))

vi.mock('@/features/logistics-config/components/packaging-profile-form-dialog', () => ({
  PackagingProfileFormDialog: () => <div data-testid='packaging-profile-form-dialog' />,
}))

vi.mock('@/features/logistics-config/hooks/use-packaging-profile-form-controller', () => ({
  usePackagingProfileFormController: () => ({
    open: false,
    setOpen: vi.fn(),
    draft: {
      id: undefined,
      code: '',
      name: '',
      packagingType: '',
      length: 0,
      width: 0,
      height: 0,
      dimensionUnitCode: '',
      netWeight: 0,
      grossWeight: 0,
      weightUnitCode: '',
      capacity: 0,
      capacityUnitCode: '',
      assemblySource: '',
      isActive: true,
      notes: '',
      targets: [],
    },
    setDraft: vi.fn(),
    products: [],
    packagingMaterials: [],
    packagingMaterialOptions: [],
    dimensionUnits: [],
    weightUnits: [],
    quantityUnits: [],
    resolvedDimensionUnitCode: '',
    resolvedWeightUnitCode: '',
    resolvedCapacityUnitCode: '',
    selectedPackagingMaterialId: '',
    selectedProduct: null,
    computedVolume: 0,
    computedGrossWeight: 0,
    packagingMaterialsLoading: false,
    savePending: false,
    handleCreate: handleCreateMock,
    handleEdit: vi.fn(),
    handleSave: vi.fn(),
    updateSelectedPackagingMaterial: vi.fn(),
    updateSelectedProduct: vi.fn(),
  }),
}))

import { SalesOrderPackagingEntry } from './sales-order-packaging-entry'

function buildSalesOrder(overrides: Partial<SalesOrder> = {}): SalesOrder {
  return {
    id: 'order-1',
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    isDeleted: false,
    orderNo: 'SO-001',
    orderName: 'Sales Order 001',
    customerName: 'Customer A',
    customerId: 'customer-1',
    type: 'STANDARD',
    currency: 'CNY',
    exchangeRateSnapshot: 1,
    paymentMethod: 'BANK',
    paymentMethodName: 'Bank',
    paymentTerm: 'COD',
    paymentTermName: 'Cash on delivery',
    classification: 'NORMAL',
    status: 'Pending',
    evidences: [],
    amount: 100,
    quantity: 10,
    orderDate: '2026-04-25',
    deliveryDate: '2026-04-30',
    purchaseOrderNo: 'PO-001',
    barcode: 'BC-001',
    requirements: '',
    lines: [],
    version: 1,
    ...overrides,
  }
}

describe('SalesOrderPackagingEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders no_lines as packaging-only state without cross-domain order actions', () => {
    const order = buildSalesOrder()

    useSalesOrderPackagingEntryMock.mockReturnValue({
      target: {
        state: 'no_lines',
        lineCount: 0,
        resolvedLineCount: 0,
        pendingSelectionLineCount: 0,
        createRuleLineCount: 0,
        missingProductLineCount: 0,
        lines: [],
      },
      preview: {
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      },
      profiles: [],
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<SalesOrderPackagingEntry order={order} />)

    expect(screen.getByText('tradingSalesOrder.packagingPreview.entry.noLinesTitle')).toBeTruthy()
    expect(screen.getByText('tradingSalesOrder.packagingPreview.entry.noLinesHint')).toBeTruthy()
    expect(
      screen.queryByRole('button', {
        name: 'tradingSalesOrder.master.actions.viewDetail',
      })
    ).toBeNull()
    expect(
      screen.queryByText('tradingSalesOrder.packagingPreview.entry.prepareLines')
    ).toBeNull()
    expect(
      screen.queryByRole('button', {
        name: 'logisticsConfig.packagingRules.addRule',
      })
    ).toBeNull()
  })

  it('shows add rule button in create_new state and opens packaging rule dialog with product context', () => {
    const order = buildSalesOrder()

    useSalesOrderPackagingEntryMock.mockReturnValue({
      target: {
        state: 'create_new',
        lineCount: 1,
        resolvedLineCount: 0,
        pendingSelectionLineCount: 0,
        createRuleLineCount: 1,
        missingProductLineCount: 0,
        actionLine: {
          lineNo: 1,
          productId: 'product-1',
          productDisplayTitle: 'Fork Alpha',
          productDisplaySubtitle: 'trail/disc/v2',
          qty: 10,
          uom: 'PCS',
          state: 'create_new',
          matchedProfiles: [],
          candidateProfiles: [],
        },
        lines: [
          {
            lineNo: 1,
            productId: 'product-1',
            productDisplayTitle: 'Fork Alpha',
            productDisplaySubtitle: 'trail/disc/v2',
            qty: 10,
            uom: 'PCS',
            state: 'create_new',
            matchedProfiles: [],
            candidateProfiles: [],
          },
        ],
      },
      preview: {
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      },
      profiles: [],
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<SalesOrderPackagingEntry order={order} />)

    fireEvent.click(screen.getByRole('button', {
      name: /tradingSalesOrder.packagingPreview.title/i,
    }))

    const addRuleButton = screen.getByRole('button', {
      name: /logisticsConfig.packagingRules.addRule/i,
    })

    fireEvent.click(addRuleButton)

    expect(handleCreateMock).toHaveBeenCalledWith('product-1')
    expect(handleCreateMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('待建规则行 1 · Fork Alpha · 10 PCS')).toBeTruthy()
  })
})

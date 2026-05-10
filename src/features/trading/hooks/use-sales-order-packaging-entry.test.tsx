// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesOrder } from '../data/schema'

const {
  getProfilesMock,
  getProductPackagingOptionsMock,
} = vi.hoisted(() => ({
  getProfilesMock: vi.fn(),
  getProductPackagingOptionsMock: vi.fn(),
}))

vi.mock('@/features/logistics-config/packaging-rules-service', () => ({
  packagingRulesService: {
    getProfiles: getProfilesMock,
  },
}))

vi.mock('@/features/engineering/services/product-core-service', () => ({
  ProductCoreService: {
    getProductPackagingOptions: getProductPackagingOptionsMock,
  },
}))

import { useSalesOrderPackagingEntry } from './use-sales-order-packaging-entry'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

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
    lines: [
      {
        lineNo: 1,
        productId: 'product-1',
        productModel: 'MODEL-A',
        productCode: 'CODE-A',
        specification: 'Spec A',
        productDisplayTitleSnapshot: 'Fork Alpha',
        productDisplaySubtitleSnapshot: 'trail/disc/v2',
        productDisplayCodeSnapshot: 'CODE-A',
        productDisplayFullLabelSnapshot: 'Fork Alpha (trail/disc/v2)',
        productDisplayStrategyVersionSnapshot: 'product-display-v1',
        description: 'Line A',
        qty: 10,
        uom: 'PCS',
        price: 10,
        amount: 100,
        deliveredQty: 0,
        customerPartNo: 'CP-001',
        jobNo: 'JOB-001',
        orderDate: '2026-04-25',
        status: 'Pending',
        returnedQuantity: 0,
        remainingReturnableQuantity: 10,
      },
    ],
    version: 1,
    ...overrides,
  }
}

describe('useSalesOrderPackagingEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProductPackagingOptionsMock.mockResolvedValue([
      {
        id: 'product-1',
        weight: 2,
      },
    ])
  })

  it('returns no_lines when the order has no line items', async () => {
    getProfilesMock.mockResolvedValue([])

    const queryClient = createQueryClient()
    const { result } = renderHook(
      () => useSalesOrderPackagingEntry(buildSalesOrder({ lines: [] })),
      {
        wrapper: createWrapper(queryClient),
      }
    )

    await waitFor(() => {
      expect(result.current.target).not.toBeNull()
    })

    expect(result.current.target?.state).toBe('no_lines')
    expect(result.current.target?.lineCount).toBe(0)
    expect(result.current.target?.lines).toHaveLength(0)
  })

  it('returns resolved when a unique active packaging profile can be auto selected for the line', async () => {
    getProfilesMock.mockResolvedValue([
      {
        id: 'profile-active',
        code: 'PK-001',
        name: 'Box A',
        packagingType: 'BOX',
        length: 10,
        width: 5,
        height: 4,
        dimensionUnitCode: 'cm',
        netWeight: 1,
        grossWeight: 0,
        weightUnitCode: 'kg',
        capacity: 10,
        capacityUnitCode: 'pcs',
        assemblySource: 'manual',
        isActive: true,
        notes: '',
        targets: [
          {
            entityType: 'product',
            entityId: 'product-1',
            isDefault: false,
            sortOrder: 0,
          },
        ],
      },
      {
        id: 'profile-b',
        code: 'PK-003',
        name: 'Box B',
        packagingType: 'BOX',
        length: 16,
        width: 8,
        height: 6,
        dimensionUnitCode: 'cm',
        netWeight: 1,
        grossWeight: 0,
        weightUnitCode: 'kg',
        capacity: 20,
        capacityUnitCode: 'pcs',
        assemblySource: 'manual',
        isActive: false,
        notes: '',
        targets: [
          {
            entityType: 'product',
            entityId: 'product-1',
            isDefault: false,
            sortOrder: 1,
          },
        ],
      },
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useSalesOrderPackagingEntry(buildSalesOrder()), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.target).not.toBeNull()
    })

    expect(result.current.target?.state).toBe('resolved')
    expect(result.current.target?.resolvedLineCount).toBe(1)
    if (result.current.target?.state !== 'resolved') {
      throw new Error('expected resolved target')
    }
    expect(result.current.target.actionLine.selectedPackaging?.profileId).toBe('profile-active')
    expect(result.current.target.actionLine.candidateProfiles).toHaveLength(1)
  })

  it('returns needs_selection when multiple active packaging profiles exist and the line has no explicit selection', async () => {
    getProfilesMock.mockResolvedValue([
      {
        id: 'profile-a',
        code: 'PK-002',
        name: 'Box A',
        packagingType: 'BOX',
        length: 12,
        width: 6,
        height: 5,
        dimensionUnitCode: 'cm',
        netWeight: 1,
        grossWeight: 0,
        weightUnitCode: 'kg',
        capacity: 12,
        capacityUnitCode: 'pcs',
        assemblySource: 'manual',
        isActive: true,
        notes: '',
        targets: [
          {
            entityType: 'product',
            entityId: 'product-1',
            isDefault: false,
            sortOrder: 0,
          },
        ],
      },
      {
        id: 'profile-b-active',
        code: 'PK-004',
        name: 'Box B Active',
        packagingType: 'BOX',
        length: 18,
        width: 9,
        height: 7,
        dimensionUnitCode: 'cm',
        netWeight: 1,
        grossWeight: 0,
        weightUnitCode: 'kg',
        capacity: 24,
        capacityUnitCode: 'pcs',
        assemblySource: 'manual',
        isActive: true,
        notes: '',
        targets: [
          {
            entityType: 'product',
            entityId: 'product-1',
            isDefault: false,
            sortOrder: 1,
          },
        ],
      },
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useSalesOrderPackagingEntry(buildSalesOrder()), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.target).not.toBeNull()
    })

    expect(result.current.target?.state).toBe('needs_selection')
    expect(result.current.target?.pendingSelectionLineCount).toBe(1)
    if (result.current.target?.state !== 'needs_selection') {
      throw new Error('expected needs_selection target')
    }
    expect(result.current.target.actionLine.candidateProfiles).toHaveLength(2)
  })

  it('returns create_new when no packaging profile exists for the current product', async () => {
    getProfilesMock.mockResolvedValue([
      {
        id: 'profile-other-product',
        code: 'PK-003',
        name: 'Box C',
        packagingType: 'BOX',
        length: 14,
        width: 7,
        height: 6,
        dimensionUnitCode: 'cm',
        netWeight: 1,
        grossWeight: 0,
        weightUnitCode: 'kg',
        capacity: 14,
        capacityUnitCode: 'pcs',
        assemblySource: 'manual',
        isActive: true,
        notes: '',
        targets: [
          {
            entityType: 'product',
            entityId: 'product-2',
            isDefault: true,
            sortOrder: 0,
          },
        ],
      },
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useSalesOrderPackagingEntry(buildSalesOrder()), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.target).not.toBeNull()
    })

    expect(result.current.target?.state).toBe('create_new')
    expect(result.current.target?.createRuleLineCount).toBe(1)
    if (result.current.target?.state !== 'create_new') {
      throw new Error('expected create_new target')
    }
    expect(result.current.target.actionLine.candidateProfiles).toHaveLength(0)
  })

  it('surfaces order line display snapshot title and subtitle for packaging entry consumers', async () => {
    getProfilesMock.mockResolvedValue([
      {
        id: 'profile-active',
        code: 'PK-005',
        name: 'Box E',
        packagingType: 'BOX',
        length: 10,
        width: 5,
        height: 4,
        dimensionUnitCode: 'cm',
        netWeight: 1,
        grossWeight: 0,
        weightUnitCode: 'kg',
        capacity: 10,
        capacityUnitCode: 'pcs',
        assemblySource: 'manual',
        isActive: true,
        notes: '',
        targets: [
          {
            entityType: 'product',
            entityId: 'product-1',
            isDefault: true,
            sortOrder: 0,
          },
        ],
      },
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useSalesOrderPackagingEntry(buildSalesOrder()), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.target).not.toBeNull()
    })

    if (result.current.target?.state !== 'resolved') {
      throw new Error('expected resolved target')
    }

    expect(result.current.target.actionLine.productDisplayTitle).toBe('Fork Alpha')
    expect(result.current.target.actionLine.productDisplaySubtitle).toBe('trail/disc/v2')
  })

  it('uses placeholders instead of legacy display fields when packaging entry snapshots are missing', async () => {
    getProfilesMock.mockResolvedValue([
      {
        id: 'profile-active',
        code: 'PK-006',
        name: 'Box F',
        packagingType: 'BOX',
        length: 10,
        width: 5,
        height: 4,
        dimensionUnitCode: 'cm',
        netWeight: 1,
        grossWeight: 0,
        weightUnitCode: 'kg',
        capacity: 10,
        capacityUnitCode: 'pcs',
        assemblySource: 'manual',
        isActive: true,
        notes: '',
        targets: [
          {
            entityType: 'product',
            entityId: 'product-1',
            isDefault: true,
            sortOrder: 0,
          },
        ],
      },
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(
      () =>
        useSalesOrderPackagingEntry(
          buildSalesOrder({
            lines: [
              {
                ...buildSalesOrder().lines[0],
                productDisplayTitleSnapshot: '',
                productDisplaySubtitleSnapshot: '',
                productDisplayFullLabelSnapshot: '',
              },
            ],
          })
        ),
      {
        wrapper: createWrapper(queryClient),
      }
    )

    await waitFor(() => {
      expect(result.current.target).not.toBeNull()
    })

    if (result.current.target?.state !== 'resolved') {
      throw new Error('expected resolved target')
    }

    expect(result.current.target.actionLine.productDisplayTitle).toBe('未识别产品')
    expect(result.current.target.actionLine.productDisplaySubtitle).toBe('--')
  })

  it('keeps the packaging entry target available even when packaging preview is still loading', async () => {
    getProfilesMock.mockResolvedValue([
      {
        id: 'profile-active',
        code: 'PK-004',
        name: 'Box D',
        packagingType: 'BOX',
        length: 10,
        width: 5,
        height: 4,
        dimensionUnitCode: 'cm',
        netWeight: 1,
        grossWeight: 0,
        weightUnitCode: 'kg',
        capacity: 10,
        capacityUnitCode: 'pcs',
        assemblySource: 'manual',
        isActive: true,
        notes: '',
        targets: [
          {
            entityType: 'product',
            entityId: 'product-1',
            isDefault: true,
            sortOrder: 0,
          },
        ],
      },
    ])
    getProductPackagingOptionsMock.mockImplementation(
      () => new Promise(() => undefined)
    )

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useSalesOrderPackagingEntry(buildSalesOrder()), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.target).not.toBeNull()
    })

    expect(result.current.target?.state).toBe('resolved')
    expect(result.current.preview.data).toBeNull()
  })
})

// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesOrder } from '../data/schema'

const {
  getProfilesMock,
  getProductPackagingOptionsMock,
  getProductsMock,
} = vi.hoisted(() => ({
  getProfilesMock: vi.fn(),
  getProductPackagingOptionsMock: vi.fn(),
  getProductsMock: vi.fn(),
}))

vi.mock('@/features/logistics-config/packaging-rules-service', () => ({
  packagingRulesService: {
    getProfiles: getProfilesMock,
  },
}))

vi.mock('@/features/engineering/services/product-core-service', () => ({
  ProductCoreService: {
    getProductPackagingOptions: getProductPackagingOptionsMock,
    getProducts: getProductsMock,
  },
}))

import { useSalesOrderPackagingPreview } from './use-sales-order-packaging-preview'

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
    status: 'Canceled',
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
        description: 'Line A',
        qty: 10,
        uom: 'PCS',
        price: 10,
        amount: 100,
        deliveredQty: 0,
        customerPartNo: 'CP-001',
        jobNo: 'JOB-001',
        orderDate: '2026-04-25',
        status: 'Canceled',
        returnedQuantity: 0,
        remainingReturnableQuantity: 10,
      },
    ],
    version: 1,
    ...overrides,
  }
}

describe('useSalesOrderPackagingPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProfilesMock.mockResolvedValue([
      {
        id: 'profile-1',
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
            isDefault: true,
            sortOrder: 0,
          },
        ],
      },
    ])
    getProductPackagingOptionsMock.mockResolvedValue([
      {
        id: 'product-1',
        weight: 2,
      },
    ])
    getProductsMock.mockResolvedValue([])
  })

  it('builds packaging preview data from lightweight product options without calling full getProducts', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useSalesOrderPackagingPreview(buildSalesOrder()), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })

    expect(getProductPackagingOptionsMock).toHaveBeenCalledTimes(1)
    expect(getProductsMock).not.toHaveBeenCalled()
    expect(result.current.isError).toBe(false)
    expect(result.current.data?.lines[0]?.productWeight).toBe(2)
    expect(result.current.data?.summary.totalBoxCount).toBe(1)
    expect(result.current.data?.summary.totalGrossWeight).toBe(21)
  })
})

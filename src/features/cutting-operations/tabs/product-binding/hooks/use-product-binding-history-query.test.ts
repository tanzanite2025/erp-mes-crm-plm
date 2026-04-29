import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  listBindingsMock,
  countBindingsMock,
} = vi.hoisted(() => ({
  listBindingsMock: vi.fn(),
  countBindingsMock: vi.fn(),
}))

vi.mock('../services/product-binding-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/product-binding-service')>()
  return {
    ...actual,
    productBindingService: {
      listBindings: listBindingsMock,
      countBindings: countBindingsMock,
    },
  }
})

import {
  buildProductBindingHistoryCountQueryKey,
  buildProductBindingHistoryQueryKey,
  invalidateProductBindingHistoryQueries,
  productBindingHistoryCountQueryBaseKey,
  productBindingHistoryQueryBaseKey,
  productBindingHistoryQueryRootKey,
} from './use-product-binding-history-query'

describe('useProductBindingHistoryQuery helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds stable list query keys under the list branch', () => {
    expect(
      buildProductBindingHistoryQueryKey({
        limit: 12,
        productBarcode: '  PROD-1  ',
        prepregBindingToken: '  PREPREG-BIND-1  ',
      })
    ).toEqual([
      ...productBindingHistoryQueryBaseKey,
      12,
      'PROD-1',
      'PREPREG-BIND-1',
    ])
  })

  it('builds stable count query keys under the count branch', () => {
    expect(
      buildProductBindingHistoryCountQueryKey({
        productBarcode: ' PROD-2 ',
        prepregBindingToken: ' PREPREG-BIND-2 ',
      })
    ).toEqual([
      ...productBindingHistoryCountQueryBaseKey,
      'PROD-2',
      'PREPREG-BIND-2',
    ])
  })

  it('keeps list and count keys separated under a shared root', () => {
    expect(productBindingHistoryQueryBaseKey).toEqual([
      ...productBindingHistoryQueryRootKey,
      'list',
    ])
    expect(productBindingHistoryCountQueryBaseKey).toEqual([
      ...productBindingHistoryQueryRootKey,
      'count',
    ])
  })

  it('invalidates both list and count history branches', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = {
      invalidateQueries,
    }

    await invalidateProductBindingHistoryQueries(queryClient as never)

    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: productBindingHistoryQueryBaseKey,
    })
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: productBindingHistoryCountQueryBaseKey,
    })
  })
})

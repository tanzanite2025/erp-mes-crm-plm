// @vitest-environment jsdom
import { type ReactNode } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../data/schema'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY,
} from '../query-keys'
import { useProductAttributeWriteActions } from './use-product-attribute-write-actions'

const productAttributeDeletionApi = vi.hoisted(() => ({
  deleteCategory: vi.fn(),
  deleteOption: vi.fn(),
}))
vi.mock('../services/product-attribute-category-service', () => ({
  ProductAttributeCategoryService: {
    deleteProductAttributeCategory: productAttributeDeletionApi.deleteCategory,
  },
}))
vi.mock('../services/product-attribute-option-service', () => ({
  ProductAttributeOptionService: {
    deleteProductAttributeOption: productAttributeDeletionApi.deleteOption,
  },
}))

const categoryCacheKeys = [
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
]
const optionCacheKeys = [
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY,
]
const categories: ProductTemplateAttributeLevelOneCategory[] = [
  {
    id: 'color-category',
    key: 'color',
    nameZh: '颜色',
    active: true,
    sortOrder: 10,
    version: 1,
  },
  {
    id: 'finish-category',
    key: 'finish',
    nameZh: '表面',
    active: true,
    sortOrder: 20,
    version: 1,
  },
]
const options: ProductTemplateAttributeLevelTwoOption[] = [
  {
    id: 'black-option',
    categoryKey: 'COLOR',
    value: 'black',
    labelZh: '黑色',
    active: true,
    sortOrder: 10,
    version: 1,
  },
  {
    id: 'matte-option',
    categoryKey: 'finish',
    value: 'matte',
    labelZh: '磨砂',
    active: true,
    sortOrder: 10,
    version: 1,
  },
]
const queryClients: QueryClient[] = []
const unsubscribeObservers: (() => void)[] = []

function renderProductAttributeWriteActionsWithFailingBackgroundRefresh() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClients.push(queryClient)
  categoryCacheKeys.forEach((queryKey) =>
    queryClient.setQueryData(queryKey, categories)
  )
  optionCacheKeys.forEach((queryKey) =>
    queryClient.setQueryData(queryKey, options)
  )
  for (const queryKey of [
    PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
    PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY,
  ]) {
    const observer = new QueryObserver(queryClient, {
      queryKey,
      staleTime: Infinity,
      queryFn: async () => {
        throw new Error('background refresh unavailable')
      },
    })
    unsubscribeObservers.push(observer.subscribe(() => {}))
  }
  function ProductAttributeWriteActionsQueryProvider({
    children,
  }: {
    children: ReactNode
  }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
  return {
    queryClient,
    ...renderHook(useProductAttributeWriteActions, {
      wrapper: ProductAttributeWriteActionsQueryProvider,
    }),
  }
}

describe('product attribute deletion cache synchronization', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    productAttributeDeletionApi.deleteCategory.mockResolvedValue(undefined)
    productAttributeDeletionApi.deleteOption.mockResolvedValue(undefined)
  })
  afterEach(() => {
    cleanup()
    unsubscribeObservers.splice(0).forEach((unsubscribe) => unsubscribe())
    queryClients.splice(0).forEach((queryClient) => queryClient.clear())
  })

  it('removes a deleted option from both lists even when the refresh fails', async () => {
    const { result, queryClient } =
      renderProductAttributeWriteActionsWithFailingBackgroundRefresh()
    await act(async () => {
      await result.current.deleteOption('black-option')
    })
    optionCacheKeys.forEach((queryKey) =>
      expect(queryClient.getQueryData(queryKey)).toEqual([options[1]])
    )
    expect(
      queryClient.getQueryState(PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY)
        ?.status
    ).toBe('error')
  })

  it('removes a deleted category and its legacy category aliases from both lists after a failed refresh', async () => {
    const { result, queryClient } =
      renderProductAttributeWriteActionsWithFailingBackgroundRefresh()
    await act(async () => {
      await result.current.deleteCategory('color-category')
    })
    categoryCacheKeys.forEach((queryKey) =>
      expect(queryClient.getQueryData(queryKey)).toEqual([categories[1]])
    )
    optionCacheKeys.forEach((queryKey) =>
      expect(queryClient.getQueryData(queryKey)).toEqual([options[1]])
    )
    expect(
      queryClient.getQueryState(PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY)
        ?.status
    ).toBe('error')
  })

  it('preserves all cached records when the server rejects deletion of a referenced option', async () => {
    productAttributeDeletionApi.deleteOption.mockRejectedValue(
      new Error('该属性已被产品使用')
    )
    const { result, queryClient } =
      renderProductAttributeWriteActionsWithFailingBackgroundRefresh()
    await act(async () => {
      await expect(result.current.deleteOption('black-option')).rejects.toThrow(
        '已被产品使用'
      )
    })
    optionCacheKeys.forEach((queryKey) =>
      expect(queryClient.getQueryData(queryKey)).toEqual(options)
    )
    categoryCacheKeys.forEach((queryKey) =>
      expect(queryClient.getQueryData(queryKey)).toEqual(categories)
    )
  })
})

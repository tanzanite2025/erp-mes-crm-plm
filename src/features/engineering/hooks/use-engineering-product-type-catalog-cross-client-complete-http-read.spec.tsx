// @vitest-environment jsdom
import type { ReactNode } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductTypeApiDTO } from '../contracts/product-type-api-dto'
import { ProductTypeService } from '../services/product-type-service'
import { buildProductTypeHierarchyMetaMap } from '../utils/product-type-tree'
import { useEngineeringBootstrap } from './use-engineering-bootstrap'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: 'product-type-cross-client-contract-token',
    }),
  },
}))
vi.mock('../services/product-core-service', () => ({
  ProductCoreService: { getAuthoritativeProducts: async () => [] },
}))

let storedProductTypes: ProductTypeApiDTO[]
const productTypeQueryClients: QueryClient[] = []

function renderProductTypeCatalogForIndependentClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  })
  productTypeQueryClients.push(queryClient)
  return renderHook(useEngineeringBootstrap, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}

async function createProductTypeBranchFromAnotherClient() {
  const category = await ProductTypeService.createProductType({
    name: '另一台电脑新增的一级分类',
    code: 'REMOTE-L1',
    active: true,
    sortOrder: 60,
  })
  const subcategory = await ProductTypeService.createProductType({
    name: '新增二级分类',
    code: 'REMOTE-L2',
    parentId: category.id,
    active: true,
    sortOrder: 61,
  })
  const baseModel = await ProductTypeService.createProductType({
    name: '新增基础型号 R50',
    code: 'REMOTE-R50',
    parentId: subcategory.id,
    templateId: 'existing-template',
    active: true,
    sortOrder: 62,
  })
  return { category, subcategory, baseModel }
}

beforeEach(() => {
  focusManager.setFocused(true)
  document.cookie = 'csrf_token=product-type-contract-csrf; path=/'
  storedProductTypes = Array.from({ length: 60 }, (_, index) => ({
    id: `existing-category-${index}`,
    name: `已有分类 ${index}`,
    code: `EXISTING-${index}`,
    active: true,
    sortOrder: index,
    version: 1,
  }))
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input, init) => {
      const requestUrl = new URL(String(input), 'http://product-type-contract')
      if (requestUrl.pathname !== '/api/v1/engineering/product-types') {
        throw new Error(
          `Unexpected product type request: ${requestUrl.pathname}`
        )
      }
      if (init?.method === 'POST') {
        const saved = {
          ...JSON.parse(String(init.body)),
          id: `created-category-${storedProductTypes.length}`,
          sortOrder: storedProductTypes.length,
        } as ProductTypeApiDTO
        storedProductTypes.push(saved)
        return Response.json(saved)
      }
      if (requestUrl.searchParams.get('options') === 'true') {
        return Response.json(storedProductTypes)
      }
      return Response.json({
        items: storedProductTypes.slice(0, 50),
        total: storedProductTypes.length,
        page: 1,
        pageSize: 50,
      })
    })
  )
})

afterEach(() => {
  cleanup()
  productTypeQueryClients.splice(0).forEach((client) => client.clear())
  vi.unstubAllGlobals()
  focusManager.setFocused(undefined)
  document.cookie = 'csrf_token=; max-age=0; path=/'
})

describe('complete product category reads across independent clients', () => {
  it('includes another client’s new category branch beyond the first 50 records after a fresh page load', async () => {
    const { baseModel } = await createProductTypeBranchFromAnotherClient()
    const { result } = renderProductTypeCatalogForIndependentClient()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.types).toHaveLength(63)
    expect(
      buildProductTypeHierarchyMetaMap(result.current.types).get(baseModel.id)
    ).toMatchObject({
      level: 2,
      pathLabel: '另一台电脑新增的一级分类 / 新增二级分类 / 新增基础型号 R50',
    })
  })

  it('updates an already open client on focus even when its previous catalog is still considered fresh', async () => {
    const { result } = renderProductTypeCatalogForIndependentClient()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    act(() => focusManager.setFocused(false))
    const { baseModel } = await createProductTypeBranchFromAnotherClient()
    act(() => focusManager.setFocused(true))
    await waitFor(() =>
      expect(
        result.current.types.some((type) => type.id === baseModel.id)
      ).toBe(true)
    )
    expect(result.current.types).toHaveLength(63)
  })
})

import { describe, expect, it } from 'vitest'
import { toWarehouseCategoryListPageContract } from './warehouse-category-api-adapter'

describe('warehouse-category-api-adapter', () => {
  it('does not synthesize missing list items into an empty category list', () => {
    expect(() =>
      toWarehouseCategoryListPageContract({
        total: 0,
        page: 1,
        pageSize: 50,
      } as never)
    ).toThrow()
  })
})

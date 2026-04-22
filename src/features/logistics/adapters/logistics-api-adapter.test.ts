import { describe, expect, it } from 'vitest'
import { toLogisticsListPageContract } from './logistics-api-adapter'

describe('logistics-api-adapter', () => {
  it('does not synthesize missing list items into an empty logistics page', () => {
    expect(() =>
      toLogisticsListPageContract({
        total: 0,
        page: 1,
        pageSize: 50,
      } as never)
    ).toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import { toReceivableListPageContract } from './receivable-api-adapter'

const summary = {
  totalReceivable: 0,
  overdueReceivable: 0,
  pendingReceiptCount: 0,
}

describe('receivable-api-adapter', () => {
  it('does not synthesize missing list items into an empty page', () => {
    expect(() =>
      toReceivableListPageContract({
        total: 0,
        page: 1,
        pageSize: 50,
        summary,
      } as never)
    ).toThrow()
  })
})

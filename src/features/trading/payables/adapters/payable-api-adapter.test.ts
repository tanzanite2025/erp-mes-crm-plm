import { describe, expect, it } from 'vitest'
import { toPayableListPageContract } from './payable-api-adapter'

const summary = {
  totalPayable: 0,
  overduePayable: 0,
  pendingPaymentCount: 0,
}

describe('payable-api-adapter', () => {
  it('does not synthesize missing list items into an empty page', () => {
    expect(() =>
      toPayableListPageContract({
        total: 0,
        page: 1,
        pageSize: 50,
        summary,
      } as never)
    ).toThrow()
  })
})

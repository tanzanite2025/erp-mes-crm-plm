import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { createProductionMaterialIssuanceActiveOrderProgressTestFixture } from '../testing/production-material-issuance-active-order-progress-frozen-current-and-incomplete-scope-test-fixture'
import { queryProductionMaterialIssuanceActiveOrderProgress } from './production-material-issuance-active-order-scope-progress-query-service'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
const query = { materialsPage: 1, ordersPage: 1, pageSize: 20 }
beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
})

describe('active production material scope response validation', () => {
  it('reads a server page with an abort signal and preserves separate outstanding and excess quantities', async () => {
    const fixture =
      createProductionMaterialIssuanceActiveOrderProgressTestFixture()
    vi.mocked(apiFetch).mockResolvedValue(fixture)
    const signal = new AbortController().signal
    const result = await queryProductionMaterialIssuanceActiveOrderProgress(
      query,
      signal
    )
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'active-order-progress?materialsPage=1&ordersPage=1&pageSize=20'
      ),
      { signal }
    )
    expect(result.materials[0]).toMatchObject({
      remainingQty: 40,
      excessQty: 20,
    })
    expect(result.orderLines[2]).toMatchObject({
      issueCode: 'MISSING_BOM',
      materials: [],
    })
  })

  it('rejects missing projections, changed scope, incomplete pages and cross-line allocations', async () => {
    for (const corrupt of [
      (
        response: ReturnType<
          typeof createProductionMaterialIssuanceActiveOrderProgressTestFixture
        >
      ) => ({ ...response, materials: null }),
      (
        response: ReturnType<
          typeof createProductionMaterialIssuanceActiveOrderProgressTestFixture
        >
      ) => ({ ...response, ordersPage: 2 }),
      (
        response: ReturnType<
          typeof createProductionMaterialIssuanceActiveOrderProgressTestFixture
        >
      ) => ({ ...response, orderLines: [] }),
      (
        response: ReturnType<
          typeof createProductionMaterialIssuanceActiveOrderProgressTestFixture
        >
      ) => ({ ...response, scope: { ...response.scope, isComplete: true } }),
      (
        response: ReturnType<
          typeof createProductionMaterialIssuanceActiveOrderProgressTestFixture
        >
      ) => {
        response.orderLines[0].materials[0].salesOrderLineId = 999
        return response
      },
      (
        response: ReturnType<
          typeof createProductionMaterialIssuanceActiveOrderProgressTestFixture
        >
      ) => {
        response.orderLines[0].materials[0].sourceSnapshotId = ''
        return response
      },
    ]) {
      vi.mocked(apiFetch).mockResolvedValue(
        corrupt(
          createProductionMaterialIssuanceActiveOrderProgressTestFixture()
        )
      )
      await expect(
        queryProductionMaterialIssuanceActiveOrderProgress(query)
      ).rejects.toThrow()
    }
  })

  it('propagates transport failure and rejects invalid parameters before reading', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('database unavailable'))
    await expect(
      queryProductionMaterialIssuanceActiveOrderProgress(query)
    ).rejects.toThrow('database unavailable')
    vi.mocked(apiFetch).mockClear()
    await expect(
      queryProductionMaterialIssuanceActiveOrderProgress({
        ...query,
        pageSize: 101,
      })
    ).rejects.toThrow()
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

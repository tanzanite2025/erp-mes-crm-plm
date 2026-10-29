import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture } from '../testing/production-material-issuance-reviewed-source-and-frozen-document-test-fixtures'
import {
  getProductionMaterialIssuanceDocument,
  listProductionMaterialIssuanceDocuments,
  reviewProductionMaterialIssuanceSources,
} from './production-material-issuance-source-review-and-document-query-service'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
beforeEach(() => vi.mocked(apiFetch).mockReset())

describe('production material read-only API contracts', () => {
  it('posts only explicit real identities and accepts the reviewed server quantities', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch).mockResolvedValue(fixture.review)
    expect(
      await reviewProductionMaterialIssuanceSources([fixture.selection])
    ).toEqual(fixture.review)
    expect(apiFetch).toHaveBeenCalledWith(
      '/mrp/production-material-issuance/source-review',
      { method: 'POST', body: JSON.stringify({ sources: [fixture.selection] }) }
    )
    expect(apiFetch).toHaveBeenCalledOnce()
  })

  it('rejects empty, duplicate, invalid or excessive source selections before making a request', async () => {
    const { selection } =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    for (const selections of [
      [],
      [selection, selection],
      [{ ...selection, bomId: '' }],
      [{ ...selection, salesOrderLineId: 0 }],
      [{ ...selection, salesOrderLineId: Number.MAX_SAFE_INTEGER + 1 }],
      Array.from({ length: 501 }, (_, index) => ({
        ...selection,
        salesOrderLineId: index + 1,
      })),
    ]) {
      await expect(
        reviewProductionMaterialIssuanceSources(selections)
      ).rejects.toThrow()
    }
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('rejects partial, foreign, incomplete and nonfinite bases instead of passing them to the UI', async () => {
    const { selection, review, basis } =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    for (const invalid of [
      { ...review, sources: [] },
      { ...review, sources: [basis, basis] },
      { ...review, sources: [{ ...basis, salesOrderLineId: 999 }] },
      { ...review, sources: [{ ...basis, salesOrderId: basis.productId }] },
      {
        ...review,
        sources: [{ ...basis, bom: { ...basis.bom, id: basis.productId } }],
      },
      { ...review, sources: [{ ...basis, finishedUnit: '' }] },
      { ...review, sources: [{ ...basis, basisFingerprint: '' }] },
      {
        ...review,
        sources: [
          { ...basis, bom: { ...basis.bom, measuredWeight: Infinity } },
        ],
      },
      {
        ...review,
        sources: [
          {
            ...basis,
            contributions: [{ ...basis.contributions[0], requiredQty: NaN }],
          },
        ],
      },
    ]) {
      vi.mocked(apiFetch).mockResolvedValueOnce(invalid)
      await expect(
        reviewProductionMaterialIssuanceSources([selection])
      ).rejects.toThrow()
    }
  })

  it('keeps cancellation and validates complete page metadata and filters', async () => {
    const { list } =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    const signal = new AbortController().signal
    const query = { status: 'DISPATCHED' as const, page: 1, pageSize: 20 }
    vi.mocked(apiFetch).mockResolvedValueOnce(list)
    expect(
      await listProductionMaterialIssuanceDocuments(query, signal)
    ).toEqual(list)
    expect(apiFetch).toHaveBeenLastCalledWith(
      '/mrp/production-material-issuance/documents?status=DISPATCHED&page=1&pageSize=20',
      { signal }
    )
    for (const invalid of [
      { ...list, page: 2 },
      { ...list, pageSize: 1 },
      { ...list, total: 5 },
      { ...list, items: [list.items[0], list.items[0]], total: 2 },
    ]) {
      vi.mocked(apiFetch).mockResolvedValueOnce(invalid)
      await expect(
        listProductionMaterialIssuanceDocuments(query)
      ).rejects.toThrow()
    }
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('forbidden'))
    await expect(
      listProductionMaterialIssuanceDocuments(query)
    ).rejects.toThrow('forbidden')
  })

  it('reads frozen detail by identity and rejects mismatched or inconsistent document states', async () => {
    const { detail, basis } =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch).mockResolvedValueOnce(detail)
    expect(
      await getProductionMaterialIssuanceDocument(detail.document.id)
    ).toEqual(detail)
    for (const invalid of [
      { ...detail, document: { ...detail.document, id: basis.productId } },
      { ...detail, document: { ...detail.document, status: 'WITHDRAWN' } },
      { ...detail, sources: [] },
    ]) {
      vi.mocked(apiFetch).mockResolvedValueOnce(invalid)
      await expect(
        getProductionMaterialIssuanceDocument(detail.document.id)
      ).rejects.toThrow()
    }
    vi.mocked(apiFetch).mockClear()
    await expect(
      getProductionMaterialIssuanceDocument('../other-endpoint')
    ).rejects.toThrow()
    await expect(
      listProductionMaterialIssuanceDocuments({
        status: '',
        page: 0,
        pageSize: 20,
      })
    ).rejects.toThrow()
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

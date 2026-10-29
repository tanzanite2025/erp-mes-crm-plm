import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture } from '../testing/production-material-issuance-reviewed-source-and-frozen-document-test-fixtures'
import {
  prepareProductionMaterialIssuanceSources,
  queryProductionMaterialIssuanceSourceOptions,
} from './production-material-issuance-source-options-and-preparation-query-service'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
beforeEach(() => vi.mocked(apiFetch).mockReset())
const fixture =
  createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
function createProductionMaterialIssuanceSourceOptionsValidationTestResponse() {
  return {
    items: [
      { ...fixture.basis, status: 'Pending', documentId: '', documentNo: '' },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    search: '',
  }
}
function createProductionMaterialIssuanceSourcePreparationValidationTestResponse() {
  return {
    sourceLines: [
      {
        ...fixture.basis,
        totalLines: 1,
        productModel: 'R50',
        bomCandidates: [fixture.basis.bom],
        issueCode: '',
      },
    ],
    issues: [],
    isReady: true,
    warehouseCategoryCode: 'MATERIAL',
  }
}

describe('production source selection and preparation response boundaries', () => {
  it('queries only the narrow production endpoint and validates complete pages and search scope', async () => {
    const signal = new AbortController().signal
    vi.mocked(apiFetch).mockResolvedValue(
      createProductionMaterialIssuanceSourceOptionsValidationTestResponse()
    )
    await queryProductionMaterialIssuanceSourceOptions(
      { search: '', page: 1, pageSize: 20 },
      signal
    )
    expect(apiFetch).toHaveBeenCalledWith(
      '/mrp/production-material-issuance/source-options?search=&page=1&pageSize=20',
      { signal }
    )
    for (const corrupt of [
      {
        ...createProductionMaterialIssuanceSourceOptionsValidationTestResponse(),
        items: [],
      },
      {
        ...createProductionMaterialIssuanceSourceOptionsValidationTestResponse(),
        search: 'other',
      },
      {
        ...createProductionMaterialIssuanceSourceOptionsValidationTestResponse(),
        page: 2,
      },
    ]) {
      vi.mocked(apiFetch).mockResolvedValue(corrupt)
      await expect(
        queryProductionMaterialIssuanceSourceOptions({
          search: '',
          page: 1,
          pageSize: 20,
        })
      ).rejects.toThrow()
    }
  })
  it('rejects empty or duplicate selections before any request', async () => {
    await expect(prepareProductionMaterialIssuanceSources([])).rejects.toThrow()
    await expect(
      prepareProductionMaterialIssuanceSources([
        fixture.selection,
        fixture.selection,
      ])
    ).rejects.toThrow()
    expect(apiFetch).not.toHaveBeenCalled()
  })
  it('rejects responses with substituted source identities or BOMs', async () => {
    for (const identity of [
      { salesOrderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      { salesOrderLineId: 102 },
      {
        bom: {
          ...fixture.basis.bom,
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        },
      },
    ]) {
      const prepared =
        createProductionMaterialIssuanceSourcePreparationValidationTestResponse()
      vi.mocked(apiFetch).mockResolvedValue({
        ...prepared,
        sourceLines: [{ ...prepared.sourceLines[0], ...identity }],
      })
      await expect(
        prepareProductionMaterialIssuanceSources([fixture.selection])
      ).rejects.toThrow()
    }
  })
  it('preserves explicit blockers and rejects a ready result that conceals missing weight', async () => {
    const prepared =
      createProductionMaterialIssuanceSourcePreparationValidationTestResponse()
    prepared.sourceLines[0].bom = { ...fixture.basis.bom, measuredWeight: 0 }
    vi.mocked(apiFetch).mockResolvedValue(prepared)
    await expect(
      prepareProductionMaterialIssuanceSources([fixture.selection])
    ).rejects.toThrow()
    vi.mocked(apiFetch).mockResolvedValue({
      ...prepared,
      isReady: false,
      issues: [{ salesOrderLineId: 101, code: 'INVALID_FINISHED_WEIGHT' }],
    })
    await expect(
      prepareProductionMaterialIssuanceSources([fixture.selection])
    ).resolves.toMatchObject({ isReady: false })
  })
})

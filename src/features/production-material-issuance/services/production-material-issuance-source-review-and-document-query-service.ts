import { apiFetch } from '@/lib/api-client'
import {
  productionMaterialIssuanceDocumentDetailSchema,
  productionMaterialIssuanceDocumentListQuerySchema,
  productionMaterialIssuanceDocumentListSchema,
  productionMaterialIssuanceSourceReviewRequestSchema,
  productionMaterialIssuanceSourceReviewResponseSchema,
  type ProductionMaterialIssuanceDocumentListQuery,
  type ProductionMaterialIssuanceSourceSelection,
} from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'

const queryEndpoint = '/mrp/production-material-issuance'

export async function reviewProductionMaterialIssuanceSources(
  sources: ProductionMaterialIssuanceSourceSelection[]
) {
  const request = productionMaterialIssuanceSourceReviewRequestSchema.parse({
    sources,
  })
  const result = productionMaterialIssuanceSourceReviewResponseSchema.parse(
    await apiFetch<unknown>(`${queryEndpoint}/source-review`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  )
  const expectedByLine = new Map(
    request.sources.map((source) => [source.salesOrderLineId, source])
  )
  if (
    result.sources.length !== request.sources.length ||
    result.sources.some((basis) => {
      const expected = expectedByLine.get(basis.salesOrderLineId)
      return (
        !expected ||
        expected.salesOrderId !== basis.salesOrderId ||
        expected.bomId !== basis.bom.id
      )
    })
  )
    throw new Error(
      '[CRITICAL] Production material review returned different source identities'
    )
  return result
}

export async function listProductionMaterialIssuanceDocuments(
  input: ProductionMaterialIssuanceDocumentListQuery,
  signal?: AbortSignal
) {
  const query = productionMaterialIssuanceDocumentListQuerySchema.parse(input)
  const parameters = new URLSearchParams({
    status: query.status,
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  const result = productionMaterialIssuanceDocumentListSchema.parse(
    await apiFetch<unknown>(`${queryEndpoint}/documents?${parameters}`, {
      signal,
    })
  )
  if (
    result.page !== query.page ||
    result.pageSize !== query.pageSize ||
    (query.status &&
      result.items.some((document) => document.status !== query.status))
  ) {
    throw new Error(
      '[CRITICAL] Production material document query returned a different page or status'
    )
  }
  return result
}

export async function getProductionMaterialIssuanceDocument(
  documentID: string,
  signal?: AbortSignal
) {
  // Reuse the document identity validator without accepting a caller-provided URL.
  const parsedID =
    productionMaterialIssuanceDocumentDetailSchema.shape.document.shape.id.parse(
      documentID
    )
  const result = productionMaterialIssuanceDocumentDetailSchema.parse(
    await apiFetch<unknown>(
      `${queryEndpoint}/documents/${encodeURIComponent(parsedID)}`,
      { signal }
    )
  )
  if (result.document.id !== parsedID)
    throw new Error(
      '[CRITICAL] Production material query returned a different document'
    )
  return result
}

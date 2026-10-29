import { apiFetch } from '@/lib/api-client'
import {
  productionMaterialIssuanceDispatchCommandSchema,
  productionMaterialIssuanceWithdrawalCommandSchema,
  type ProductionMaterialIssuanceDispatchCommand,
  type ProductionMaterialIssuanceWithdrawalCommand,
} from '../contracts/production-material-issuance-reviewed-dispatch-and-versioned-withdrawal-command-api-dto'
import { productionMaterialIssuanceDocumentDetailSchema } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'

export async function dispatchProductionMaterialIssuanceReviewedBasis(
  input: ProductionMaterialIssuanceDispatchCommand
) {
  const request = productionMaterialIssuanceDispatchCommandSchema.parse(input)
  const result = productionMaterialIssuanceDocumentDetailSchema.parse(
    await apiFetch<unknown>('/mrp/production-material-issuance/dispatch', {
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
        basis.salesOrderId !== expected.salesOrderId ||
        basis.bom.id !== expected.bomId ||
        basis.orderVersion !== expected.expectedOrderVersion ||
        basis.bom.version !== expected.expectedBomVersion ||
        basis.basisFingerprint !== expected.basisFingerprint
      )
    })
  )
    throw new Error(
      '[CRITICAL] Production material dispatch returned a different frozen basis'
    )
  // Replaying an old dispatch may return its already-withdrawn original document.
  return result
}

export async function withdrawProductionMaterialIssuanceDocumentWithVersion(
  input: ProductionMaterialIssuanceWithdrawalCommand
) {
  const request = productionMaterialIssuanceWithdrawalCommandSchema.parse(input)
  const { documentId, ...body } = request
  const result = productionMaterialIssuanceDocumentDetailSchema.parse(
    await apiFetch<unknown>(
      `/mrp/production-material-issuance/documents/${encodeURIComponent(documentId)}/withdraw`,
      { method: 'POST', body: JSON.stringify(body) }
    )
  )
  if (
    result.document.id !== documentId ||
    result.document.status !== 'WITHDRAWN' ||
    result.document.version !== request.expectedVersion + 1 ||
    result.document.withdrawalReason !== request.reason
  )
    throw new Error(
      '[CRITICAL] Production material withdrawal returned a different document or result'
    )
  return result
}

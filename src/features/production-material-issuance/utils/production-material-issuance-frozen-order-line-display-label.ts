import type { ProductionMaterialIssuanceReviewedSourceBasis } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'

export function productionMaterialIssuanceFrozenOrderLineDisplayLabel(
  sources: ProductionMaterialIssuanceReviewedSourceBasis[],
  lineId: number
) {
  const source = sources.find((item) => item.salesOrderLineId === lineId)
  return source
    ? `${source.orderNo} / ${source.lineNo} / ${source.productName}`
    : String(lineId)
}

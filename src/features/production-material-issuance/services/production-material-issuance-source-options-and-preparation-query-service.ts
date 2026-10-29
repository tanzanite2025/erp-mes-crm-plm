import { apiFetch } from '@/lib/api-client'
import {
  productionMaterialIssuanceSourceOptionsQuerySchema,
  productionMaterialIssuanceSourceOptionsSchema,
  productionMaterialIssuanceSourcePreparationRequestSchema,
  productionMaterialIssuanceSourcePreparationResponseSchema,
  type ProductionMaterialIssuanceSourceOptionsQuery,
  type ProductionMaterialIssuanceSourcePreparationSelection,
} from '../contracts/production-material-issuance-source-selection-and-preparation-api-dto'

export async function queryProductionMaterialIssuanceSourceOptions(
  input: ProductionMaterialIssuanceSourceOptionsQuery,
  signal?: AbortSignal
) {
  const query = productionMaterialIssuanceSourceOptionsQuerySchema.parse(input)
  const parameters = new URLSearchParams({
    search: query.search,
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  const result = productionMaterialIssuanceSourceOptionsSchema.parse(
    await apiFetch<unknown>(
      `/mrp/production-material-issuance/source-options?${parameters}`,
      { signal }
    )
  )
  if (
    result.search !== query.search ||
    result.page !== query.page ||
    result.pageSize !== query.pageSize
  )
    throw new Error(
      '[CRITICAL] Production source query returned a different scope'
    )
  return result
}

export async function prepareProductionMaterialIssuanceSources(
  sources: ProductionMaterialIssuanceSourcePreparationSelection[]
) {
  const request =
    productionMaterialIssuanceSourcePreparationRequestSchema.parse({ sources })
  const result =
    productionMaterialIssuanceSourcePreparationResponseSchema.parse(
      await apiFetch<unknown>(
        '/mrp/production-material-issuance/source-preparation',
        { method: 'POST', body: JSON.stringify(request) }
      )
    )
  const expected = new Map(
    request.sources.map((source) => [source.salesOrderLineId, source])
  )
  if (
    result.sourceLines.length !== request.sources.length ||
    result.sourceLines.some((source) => {
      const selection = expected.get(source.salesOrderLineId)
      return (
        !selection ||
        selection.salesOrderId !== source.salesOrderId ||
        (selection.bomId && source.bom && selection.bomId !== source.bom.id)
      )
    })
  )
    throw new Error(
      '[CRITICAL] Source preparation returned different source identities or BOM choices'
    )
  return result
}

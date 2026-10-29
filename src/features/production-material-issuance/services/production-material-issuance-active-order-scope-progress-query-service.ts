import { apiFetch } from '@/lib/api-client'
import {
  productionMaterialIssuanceActiveProgressQuerySchema,
  productionMaterialIssuanceActiveProgressResponseSchema,
  type ProductionMaterialIssuanceActiveProgressQuery,
} from '../contracts/production-material-issuance-active-order-scope-progress-api-dto'

export async function queryProductionMaterialIssuanceActiveOrderProgress(
  input: ProductionMaterialIssuanceActiveProgressQuery,
  signal?: AbortSignal
) {
  const query = productionMaterialIssuanceActiveProgressQuerySchema.parse(input)
  const parameters = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)])
  )
  const result = productionMaterialIssuanceActiveProgressResponseSchema.parse(
    await apiFetch<unknown>(
      `/mrp/production-material-issuance/active-order-progress?${parameters}`,
      { signal }
    )
  )
  if (
    result.materialsPage !== query.materialsPage ||
    result.ordersPage !== query.ordersPage ||
    result.pageSize !== query.pageSize
  )
    throw new Error(
      '[CRITICAL] Production material progress returned a different page or scope'
    )
  return result
}

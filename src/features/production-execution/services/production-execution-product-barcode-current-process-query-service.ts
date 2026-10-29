import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'
import { isApiClientError } from '@/lib/api-error'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'

const productionExecutionProductBarcodeCurrentProcessSchema = z.object({
  productBarcode: z.string().min(1),
  productName: z.string(),
  routeId: z.string(),
  routeStepId: z.string(),
  currentProcessStepId: z.string(),
  currentProcessStep: z
    .object({ id: z.string(), code: z.string(), name: z.string() })
    .nullish(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'HOLD', 'REWORK']),
})

export type ProductionExecutionProductBarcodeCurrentProcess = z.infer<
  typeof productionExecutionProductBarcodeCurrentProcessSchema
>

/** Read the product's recorded process without executing a production command. */
export async function queryProductionExecutionProductBarcodeCurrentProcess(
  barcode: string,
  signal?: AbortSignal
): Promise<ProductionExecutionProductBarcodeCurrentProcess | null> {
  const productBarcode = normalizeMachineCode(barcode)
  if (!productBarcode) throw new Error('A product barcode is required')
  try {
    const state = productionExecutionProductBarcodeCurrentProcessSchema.parse(
      await apiFetch<unknown>(
        `/production/product-barcode-states/${encodeURIComponent(productBarcode)}`,
        {
          signal,
          suppressErrorStatuses: [404],
        }
      )
    )
    if (state.productBarcode !== productBarcode) {
      throw new Error(
        'The product barcode state belongs to a different product barcode'
      )
    }
    return state
  } catch (error) {
    if (isApiClientError(error) && error.status === 404) return null
    throw error
  }
}

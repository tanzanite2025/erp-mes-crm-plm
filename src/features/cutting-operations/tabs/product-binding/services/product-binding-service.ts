import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import { extractPrepregBindingToken } from '@/features/raw-materials/prepreg-binding-qr/services/prepreg-binding-token-service'

const PRODUCT_BINDING_ENDPOINT = '/production/product-barcode-bindings'

export const PRODUCT_BINDING_INTENT_CREATE = 'PRODUCT_BINDING_CREATE'

export type ProductBindingRollInstanceSummary = {
  id: string
  bindingToken: string
  specId: string
  specCode: string
  specName: string
  supplierBatchNo: string
  widthMm: string
  lengthM: string
  nominalAreaM2: string
  boxNo: string
  productionDate: string
  status: string
  activatedAt: string
}

export type CreateProductBindingRequest = {
  productBarcode: string
  prepregQrCode: string
}

export type ProductBindingTransactionRequest<TPayload> = {
  intent: string
  actorId?: string
  payload: TPayload
}

export type ProductBindingRecord = {
  id: string
  productBarcode: string
  prepregRollInstanceId: string
  prepregRollInstance: ProductBindingRollInstanceSummary | null
  prepregQrCode: string
  prepregBindingToken: string
  barcodeProtocol: string
  barcodeSummary: string
  boundAt: string
  boundBy: string
  source: string
  status: string
  message: string
}

export type ProductBindingHistoryQuery = {
  limit?: number
  productBarcode?: string
  prepregQrCode?: string
  prepregBindingToken?: string
}

export type ProductBindingHistoryResult = {
  items: ProductBindingRecord[]
  total: number
}

export type ProductBindingSubmissionOutcome = 'bound' | 'duplicate'

export function getProductBindingSubmissionOutcome(
  record: Pick<ProductBindingRecord, 'message'> | null | undefined,
): ProductBindingSubmissionOutcome {
  const message = record?.message?.trim() || ''
  if (message.includes('重复提交')) {
    return 'duplicate'
  }
  return 'bound'
}

function normalizeRollInstanceSummary(
  input: Record<string, unknown> | null | undefined,
): ProductBindingRollInstanceSummary | null {
  if (!input) return null

  return {
    id: String(input.id ?? '').trim(),
    bindingToken: String(input.bindingToken ?? '').trim(),
    specId: String(input.specId ?? '').trim(),
    specCode: String(input.specCode ?? '').trim(),
    specName: String(input.specName ?? '').trim(),
    supplierBatchNo: String(input.supplierBatchNo ?? '').trim(),
    widthMm: String(input.widthMm ?? '').trim(),
    lengthM: String(input.lengthM ?? '').trim(),
    nominalAreaM2: String(input.nominalAreaM2 ?? '').trim(),
    boxNo: String(input.boxNo ?? '').trim(),
    productionDate: String(input.productionDate ?? '').trim(),
    status: String(input.status ?? '').trim(),
    activatedAt: String(input.activatedAt ?? '').trim(),
  }
}

function normalizeProductBindingRecord(input: Record<string, unknown>): ProductBindingRecord {
  const rollInstanceRaw = input.prepregRollInstance
  const rollInstance =
    rollInstanceRaw && typeof rollInstanceRaw === 'object' && !Array.isArray(rollInstanceRaw)
      ? normalizeRollInstanceSummary(rollInstanceRaw as Record<string, unknown>)
      : null

  return {
    id: String(input.id ?? '').trim(),
    productBarcode: String(input.productBarcode ?? '').trim(),
    prepregRollInstanceId: String(input.prepregRollInstanceId ?? '').trim(),
    prepregRollInstance: rollInstance,
    prepregQrCode: String(input.prepregQrCode ?? '').trim(),
    prepregBindingToken: String(input.prepregBindingToken ?? '').trim(),
    barcodeProtocol: String(input.barcodeProtocol ?? '').trim(),
    barcodeSummary: String(input.barcodeSummary ?? '').trim(),
    boundAt: String(input.boundAt ?? '').trim(),
    boundBy: String(input.boundBy ?? '').trim(),
    source: String(input.source ?? '').trim(),
    status: String(input.status ?? 'BOUND').trim() || 'BOUND',
    message: String(input.message ?? '').trim(),
  }
}

export function normalizeProductBindingHistoryQuery(
  query: ProductBindingHistoryQuery = {},
): ProductBindingHistoryQuery {
  const prepregQrCode = query.prepregQrCode?.trim() || undefined
  const prepregBindingToken =
    query.prepregBindingToken?.trim() ||
    (prepregQrCode ? extractPrepregBindingToken(prepregQrCode) : '') ||
    undefined

  return {
    limit: typeof query.limit === 'number' ? query.limit : undefined,
    productBarcode: query.productBarcode?.trim() || undefined,
    prepregQrCode,
    prepregBindingToken,
  }
}

function normalizeCreateProductBindingRequest(
  request: CreateProductBindingRequest,
): CreateProductBindingRequest {
  return {
    productBarcode: request.productBarcode.trim(),
    prepregQrCode: request.prepregQrCode.trim(),
  }
}

export async function executeProductBinding<TPayload extends CreateProductBindingRequest>(
  request: ProductBindingTransactionRequest<TPayload>,
): Promise<ProductBindingRecord> {
  const payload = normalizeCreateProductBindingRequest(request.payload)
  const response = await apiFetch<Record<string, unknown>>(PRODUCT_BINDING_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      metadata: {
        intent: request.intent,
        actorId: request.actorId,
      },
    }),
  })

  return normalizeProductBindingRecord(
    ensureObjectResponse<Record<string, unknown>>(
      response,
      'productBindingService.executeProductBinding',
    ),
  )
}

export const productBindingService = {
  async submitBinding(request: CreateProductBindingRequest): Promise<ProductBindingRecord> {
    return executeProductBinding<CreateProductBindingRequest>({
      intent: PRODUCT_BINDING_INTENT_CREATE,
      payload: request,
    })
  },

  async listBindings(query: ProductBindingHistoryQuery = {}): Promise<ProductBindingHistoryResult> {
    const normalizedQuery = normalizeProductBindingHistoryQuery(query)
    const params = new URLSearchParams()
    if (typeof normalizedQuery.limit === 'number') {
      params.set('limit', String(normalizedQuery.limit))
    }
    if (normalizedQuery.productBarcode) {
      params.set('productBarcode', normalizedQuery.productBarcode)
    }
    if (normalizedQuery.prepregBindingToken) {
      params.set('prepregBindingToken', normalizedQuery.prepregBindingToken)
    }

    const endpoint = params.toString()
      ? `${PRODUCT_BINDING_ENDPOINT}?${params.toString()}`
      : PRODUCT_BINDING_ENDPOINT

    const response = await apiFetch<Record<string, unknown>>(endpoint)
    const checked = ensureObjectResponse<Record<string, unknown>>(
      response,
      'productBindingService.listBindings',
    )

    return {
      items: ensureArrayField<Record<string, unknown>>(
        checked,
        'items',
        'productBindingService.listBindings',
      ).map(normalizeProductBindingRecord),
      total: Number(checked.total) || 0,
    }
  },

  async countBindings(query: ProductBindingHistoryQuery = {}): Promise<number> {
    const normalizedQuery = normalizeProductBindingHistoryQuery(query)
    const params = new URLSearchParams()
    if (normalizedQuery.productBarcode) {
      params.set('productBarcode', normalizedQuery.productBarcode)
    }
    if (normalizedQuery.prepregBindingToken) {
      params.set('prepregBindingToken', normalizedQuery.prepregBindingToken)
    }

    const endpoint = params.toString()
      ? `${PRODUCT_BINDING_ENDPOINT}/count?${params.toString()}`
      : `${PRODUCT_BINDING_ENDPOINT}/count`

    const response = await apiFetch<Record<string, unknown>>(endpoint)
    const checked = ensureObjectResponse<Record<string, unknown>>(
      response,
      'productBindingService.countBindings',
    )
    return Number(checked.count) || 0
  },
}

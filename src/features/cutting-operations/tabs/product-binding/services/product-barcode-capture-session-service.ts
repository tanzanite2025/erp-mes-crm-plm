import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'

const PRODUCT_BARCODE_CAPTURE_ENDPOINT = '/production/product-barcode-capture-sessions'

export type ProductBarcodeCaptureStatus = 'Waiting' | 'Submitted' | 'Expired'

export interface ProductBarcodeCaptureSession {
  sessionId: string
  uploadToken?: string
  status: ProductBarcodeCaptureStatus
  rawCode: string
  barcodeProtocol: string
  barcodeSummary: string
  submittedAt?: string
  expiresAt: string
}

export interface SubmitProductBarcodeCaptureSessionInput {
  token: string
  rawCode: string
}

function normalizeSession(item: Partial<ProductBarcodeCaptureSession>): ProductBarcodeCaptureSession {
  return {
    sessionId: item.sessionId || '',
    uploadToken: item.uploadToken,
    status: item.status || 'Waiting',
    rawCode: item.rawCode || '',
    barcodeProtocol: item.barcodeProtocol || '',
    barcodeSummary: item.barcodeSummary || '',
    submittedAt: item.submittedAt,
    expiresAt: item.expiresAt || '',
  }
}

function apiBaseUrl(): string {
  return `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`
}

async function publicApiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message =
      (errorData as { error?: string; message?: string }).error ||
      (errorData as { error?: string; message?: string }).message ||
      `请求失败：${response.status}`
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const ProductBarcodeCaptureSessionService = {
  async create(): Promise<ProductBarcodeCaptureSession> {
    const res = await apiFetch<ProductBarcodeCaptureSession>(PRODUCT_BARCODE_CAPTURE_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return normalizeSession(
      ensureObjectResponse<ProductBarcodeCaptureSession & Record<string, unknown>>(
        res,
        'ProductBarcodeCaptureSessionService.create',
      ),
    )
  },

  async get(sessionId: string): Promise<ProductBarcodeCaptureSession> {
    const res = await apiFetch<ProductBarcodeCaptureSession>(
      `${PRODUCT_BARCODE_CAPTURE_ENDPOINT}/${sessionId}`,
    )
    return normalizeSession(
      ensureObjectResponse<ProductBarcodeCaptureSession & Record<string, unknown>>(
        res,
        'ProductBarcodeCaptureSessionService.get',
      ),
    )
  },

  async submit(
    sessionId: string,
    input: SubmitProductBarcodeCaptureSessionInput,
  ): Promise<ProductBarcodeCaptureSession> {
    const res = await publicApiFetch<ProductBarcodeCaptureSession>(
      `${PRODUCT_BARCODE_CAPTURE_ENDPOINT}/${sessionId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({
          token: input.token,
          rawCode: input.rawCode,
        }),
      },
    )
    return normalizeSession(res)
  },
}

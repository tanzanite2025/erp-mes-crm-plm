import { apiFetch } from '@/lib/api-client'

export const ASSET_TRANSACTION_INTENT_UPLOAD = 'ASSET_UPLOAD'

export interface UploadResponse {
  status: string
  url: string
  fileName: string
  size: number
}

export interface AssetTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  payload: TPayload
}

export interface AssetUploadPayload {
  file: File
}

function buildAssetUploadFormData(
  request: AssetTransactionRequest<AssetUploadPayload>
): FormData {
  const formData = new FormData()
  formData.append('file', request.payload.file)
  formData.append(
    'metadata',
    JSON.stringify({
      intent: request.intent,
      actorId: request.actorId,
    })
  )
  return formData
}

export async function executeAssetTransaction(
  request: AssetTransactionRequest<AssetUploadPayload>
): Promise<UploadResponse> {
  const res = await apiFetch<UploadResponse>('/assets/upload', {
    method: 'POST',
    body: buildAssetUploadFormData(request),
  })

  // [FAIL LOUDLY] Ensure the server actually provided a URL.
  if (!res || !res.url) {
    throw new Error(
      '[ASSET_UPLOAD] File upload succeeded at network level, but no URL was returned by the server.'
    )
  }

  return res
}

/**
 * AssetService - handles business-agnostic resource uploads such as images and drawings.
 */
export const AssetService = {
  /**
   * Upload a single native File object to the server.
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    return executeAssetTransaction({
      intent: ASSET_TRANSACTION_INTENT_UPLOAD,
      payload: { file },
    })
  },
}

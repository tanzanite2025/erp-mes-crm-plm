import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import type { PrepregFormState } from '../data/prepreg-material-spec-schema'

export type PrepregLabelCaptureStatus = 'Waiting' | 'Submitted' | 'Expired'

export interface PrepregLabelCaptureSession {
  sessionId: string
  uploadToken?: string
  status: PrepregLabelCaptureStatus
  rawText: string
  fields: Partial<PrepregFormState>
  imageName: string
  imageSize: number
  submittedAt?: string
  expiresAt: string
}

export interface SubmitPrepregLabelCaptureSessionInput {
  token: string
  rawText: string
  fields: Partial<PrepregFormState>
  imageName?: string
  imageSize?: number
}

function normalizeSession(item: Partial<PrepregLabelCaptureSession>): PrepregLabelCaptureSession {
  return {
    sessionId: item.sessionId || '',
    uploadToken: item.uploadToken,
    status: item.status || 'Waiting',
    rawText: item.rawText || '',
    fields: item.fields || {},
    imageName: item.imageName || '',
    imageSize: Number(item.imageSize) || 0,
    submittedAt: item.submittedAt,
    expiresAt: item.expiresAt || '',
  }
}

export const PrepregLabelCaptureSessionService = {
  async create(): Promise<PrepregLabelCaptureSession> {
    const res = await apiFetch<PrepregLabelCaptureSession>('/raw-materials/prepreg-label-ocr-sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return normalizeSession(
      ensureObjectResponse<PrepregLabelCaptureSession & Record<string, unknown>>(
        res,
        'PrepregLabelCaptureSessionService.create'
      )
    )
  },

  async get(sessionId: string): Promise<PrepregLabelCaptureSession> {
    const res = await apiFetch<PrepregLabelCaptureSession>(`/raw-materials/prepreg-label-ocr-sessions/${sessionId}`)
    return normalizeSession(
      ensureObjectResponse<PrepregLabelCaptureSession & Record<string, unknown>>(
        res,
        'PrepregLabelCaptureSessionService.get'
      )
    )
  },

  async submit(sessionId: string, input: SubmitPrepregLabelCaptureSessionInput): Promise<PrepregLabelCaptureSession> {
    const res = await apiFetch<PrepregLabelCaptureSession>(
      `/raw-materials/prepreg-label-ocr-sessions/${sessionId}/submit`,
      {
        ignoreBreaker: true,
        method: 'POST',
        body: JSON.stringify({
          token: input.token,
          rawText: input.rawText,
          fields: input.fields,
          imageName: input.imageName || '',
          imageSize: input.imageSize || 0,
        }),
      }
    )
    return normalizeSession(res)
  },
}

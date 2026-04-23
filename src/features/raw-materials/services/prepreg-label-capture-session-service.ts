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
    const message = (errorData as { error?: string; message?: string }).error ||
      (errorData as { error?: string; message?: string }).message ||
      `请求失败：${response.status}`
    throw new Error(message)
  }
  return response.json() as Promise<T>
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
    const res = await publicApiFetch<PrepregLabelCaptureSession>(
      `/raw-materials/prepreg-label-ocr-sessions/${sessionId}/submit`,
      {
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

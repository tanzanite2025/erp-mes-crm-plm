import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { PrepregLabelCaptureSessionService } from './prepreg-label-capture-session-service'

describe('PrepregLabelCaptureSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits capture session through apiFetch while preserving public submit bypass behavior', async () => {
    apiFetchMock.mockResolvedValue({
      sessionId: 'session-1',
      status: 'Submitted',
      rawText: 'PP-RAW',
      fields: { name: 'Prepreg A' },
      imageName: 'capture.jpg',
      imageSize: 2048,
      expiresAt: '2026-05-01T00:45:00Z',
    })

    const result = await PrepregLabelCaptureSessionService.submit('session-1', {
      token: 'token-1',
      rawText: 'PP-RAW',
      fields: { name: 'Prepreg A' },
      imageName: 'capture.jpg',
      imageSize: 2048,
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/raw-materials/prepreg-label-ocr-sessions/session-1/submit',
      {
        ignoreBreaker: true,
        method: 'POST',
        body: JSON.stringify({
          token: 'token-1',
          rawText: 'PP-RAW',
          fields: { name: 'Prepreg A' },
          imageName: 'capture.jpg',
          imageSize: 2048,
        }),
      },
    )
    expect(result.status).toBe('Submitted')
    expect(result.imageName).toBe('capture.jpg')
  })
})

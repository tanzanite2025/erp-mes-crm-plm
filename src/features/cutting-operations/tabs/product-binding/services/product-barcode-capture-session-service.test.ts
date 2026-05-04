import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { ProductBarcodeCaptureSessionService } from './product-barcode-capture-session-service'

describe('ProductBarcodeCaptureSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits capture session through apiFetch while preserving public submit bypass behavior', async () => {
    apiFetchMock.mockResolvedValue({
      sessionId: 'session-1',
      status: 'Submitted',
      rawCode: '24125031R360001',
      barcodeProtocol: 'linear-wheel-v1',
      barcodeSummary: 'summary',
      expiresAt: '2026-05-01T00:45:00Z',
    })

    const result = await ProductBarcodeCaptureSessionService.submit('session-1', {
      token: 'token-1',
      rawCode: '24125031R360001',
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/production/product-barcode-capture-sessions/session-1/submit',
      {
        ignoreBreaker: true,
        method: 'POST',
        body: JSON.stringify({
          token: 'token-1',
          rawCode: '24125031R360001',
        }),
      },
    )
    expect(result.status).toBe('Submitted')
    expect(result.barcodeProtocol).toBe('linear-wheel-v1')
  })
})

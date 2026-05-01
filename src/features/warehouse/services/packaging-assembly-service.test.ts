import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { PackagingAssemblyService } from './packaging-assembly-service'

describe('PackagingAssemblyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('loads packaging assembly records through the authorized warehouse endpoint', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'assembly-1',
          packageCode: 'PKG-001',
          status: 'BOUND',
          itemCount: 1,
          source: 'MOBILE_CAPTURE',
          sessionId: 'session-1',
          assembledBy: 'tester',
          createdAt: '2026-05-01T00:00:00Z',
          items: [
            {
              id: 'item-1',
              productBarcode: '24125031R360001',
              productBarcodeBindingId: 'binding-1',
              barcodeProtocol: 'linear-wheel-v1',
              barcodeSummary: 'summary',
              sortOrder: 1,
            },
          ],
        },
      ],
      total: 1,
    })

    const result = await PackagingAssemblyService.list(12)

    expect(apiFetchMock).toHaveBeenCalledWith('/warehouse/packaging-assemblies?limit=12')
    expect(result.items[0].packageCode).toBe('PKG-001')
    expect(result.items[0].items[0].productBarcode).toBe('24125031R360001')
  })

  it('creates a capture session through the authorized endpoint', async () => {
    apiFetchMock.mockResolvedValue({
      sessionId: 'session-1',
      uploadToken: 'token-1',
      status: 'Waiting',
      packageCode: 'PKG-001',
      assemblyId: '',
      expiresAt: '2026-05-01T00:45:00Z',
    })

    const result = await PackagingAssemblyService.createCaptureSession()

    expect(apiFetchMock).toHaveBeenCalledWith('/warehouse/packaging-assemblies/capture-sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    expect(result.uploadToken).toBe('token-1')
  })

  it('submits mobile capture through the public API endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        status: 'Submitted',
        packageCode: 'PKG-001',
        assemblyId: 'assembly-1',
        expiresAt: '2026-05-01T00:45:00Z',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await PackagingAssemblyService.submitCaptureSession('session-1', {
      token: 'token-1',
      productBarcodes: ['24125031R360001'],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/warehouse/packaging-assemblies/capture-sessions/session-1/submit',
      {
        method: 'POST',
        body: JSON.stringify({
          token: 'token-1',
          productBarcodes: ['24125031R360001'],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
    expect(result.status).toBe('Submitted')
  })
})

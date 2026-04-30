import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ASSET_TRANSACTION_INTENT_UPLOAD,
  AssetService,
  executeAssetTransaction,
} from './asset-service'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

describe('AssetService transaction contracts', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    apiFetchMock.mockResolvedValue({
      status: 'success',
      url: '/uploads/a.png',
      fileName: 'a.png',
      size: 10,
    })
  })

  it('uploadFile sends multipart metadata intent', async () => {
    const file = new File(['content'], 'a.png', { type: 'image/png' })

    await AssetService.uploadFile(file)

    expect(apiFetchMock).toHaveBeenCalledWith('/assets/upload', {
      method: 'POST',
      body: expect.any(FormData),
    })
    const body = apiFetchMock.mock.calls[0][1].body as FormData
    expect(body.get('file')).toBe(file)
    expect(JSON.parse(String(body.get('metadata')))).toEqual({
      intent: ASSET_TRANSACTION_INTENT_UPLOAD,
    })
  })

  it('executeAssetTransaction keeps actor metadata available', async () => {
    const file = new File(['content'], 'b.png', { type: 'image/png' })

    await executeAssetTransaction({
      intent: ASSET_TRANSACTION_INTENT_UPLOAD,
      actorId: 'operator-1',
      payload: { file },
    })

    const body = apiFetchMock.mock.calls[0][1].body as FormData
    expect(JSON.parse(String(body.get('metadata')))).toEqual({
      intent: ASSET_TRANSACTION_INTENT_UPLOAD,
      actorId: 'operator-1',
    })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type SaveBOMInput } from '../mutation-types'
import { createEmptyBOMFormValue } from '../utils/bom-form-defaults'
import { bomService } from './bom-service'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'isolated-bom-publish-contract' }),
  },
}))

const publishRequest = vi.fn<typeof fetch>()

function buildBOMSaveAndPublishHTTPContractInput(
  publishOnSave?: boolean
): SaveBOMInput {
  return {
    ...createEmptyBOMFormValue({
      productId: 'product-r50',
      measuredWeight: 420,
      measuredWeightUnit: 'g',
      effectiveFrom: '2020-02-29',
    }),
    publishOnSave,
    relationSidecar: {
      kind: 'parent_children_protocol',
      version: 'v1',
      protocolDraft: { rootChildren: [], branchNodes: [], itemNodes: [] },
    },
  }
}

beforeEach(() => {
  publishRequest.mockReset()
  vi.stubGlobal('fetch', publishRequest)
})
afterEach(() => vi.unstubAllGlobals())

describe('BOM atomic save-and-publish HTTP contract', () => {
  it.each([undefined, false, true])(
    'preserves explicit publish intent %s without changing date, weight or sidecar contracts',
    async (publishOnSave) => {
      publishRequest.mockResolvedValueOnce(
        Response.json(
          createEmptyBOMFormValue({
            id: 'saved-bom',
            productId: 'product-r50',
            status: publishOnSave ? 'RELEASED' : 'DRAFT',
            isLocked: Boolean(publishOnSave),
            version: publishOnSave ? 2 : 1,
          })
        )
      )
      const saved = await bomService.saveBOM({
        data: buildBOMSaveAndPublishHTTPContractInput(publishOnSave),
      })
      expect(publishRequest).toHaveBeenCalledTimes(1)
      const [url, request] = publishRequest.mock.calls[0]
      expect(String(url)).toMatch(/\/engineering\/bom$/)
      expect(request?.method).toBe('POST')
      const payload = JSON.parse(String(request?.body))
      expect(payload.publishOnSave).toBe(publishOnSave)
      expect(payload).toMatchObject({
        status: 'DRAFT',
        measuredWeight: 420,
        measuredWeightUnit: 'g',
        masterDataControl: { effectiveFrom: '2020-02-29T00:00:00Z' },
        relationSidecar:
          buildBOMSaveAndPublishHTTPContractInput().relationSidecar,
      })
      expect(saved.status).toBe(publishOnSave ? 'RELEASED' : 'DRAFT')
      expect(saved.isLocked).toBe(Boolean(publishOnSave))
    }
  )

  it('returns a denied publication without falling back to a draft save or a separate promote request', async () => {
    publishRequest.mockResolvedValueOnce(
      Response.json(
        { error: '[FORBIDDEN] Publication permission is required' },
        { status: 403 }
      )
    )
    await expect(
      bomService.saveBOM({
        data: buildBOMSaveAndPublishHTTPContractInput(true),
      })
    ).rejects.toThrow('FORBIDDEN')
    expect(publishRequest).toHaveBeenCalledTimes(1)
  })
})

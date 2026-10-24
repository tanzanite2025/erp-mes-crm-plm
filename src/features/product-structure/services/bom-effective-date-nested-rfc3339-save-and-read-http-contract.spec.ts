import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type SaveBOMInput } from '../mutation-types'
import { createEmptyBOMFormValue } from '../utils/bom-form-defaults'
import { bomService } from './bom-service'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'bom-effective-date-contract-token' }),
  },
}))

const dateContractRequest = vi.fn<typeof fetch>()
const dateContractWireBOM = {
  id: 'date-contract-bom',
  productId: 'product',
  bomNo: 'BOM-DATE',
  masterDataControl: {
    revisionNo: 'R8',
    changeType: 'ECN' as const,
    changeOrderNo: 'ECN-8',
    effectiveFrom: '2020-02-29T00:00:00Z',
    effectiveTo: '2030-12-31T00:00:00Z',
  },
}

function createBOMEffectiveDateContractSaveRequest(
  overrides: Partial<SaveBOMInput> = {}
): { data: SaveBOMInput } {
  return {
    data: {
      ...createEmptyBOMFormValue({ productId: 'product' }),
      relationSidecar: {
        kind: 'parent_children_protocol',
        version: 'v1',
        protocolDraft: { rootChildren: [], branchNodes: [], itemNodes: [] },
      },
      ...overrides,
    },
  }
}

beforeEach(() => {
  dateContractRequest.mockReset()
  vi.stubGlobal('fetch', dateContractRequest)
})
afterEach(() => vi.unstubAllGlobals())

describe('BOM date-only UI values use the established nested RFC3339 API contract', () => {
  it.each(['2020-02-29', '2020/2/29', '20200229'])(
    'sends %s at UTC midnight and reads the saved date back',
    async (text) => {
      dateContractRequest.mockResolvedValueOnce(
        Response.json(dateContractWireBOM)
      )
      const saved = await bomService.saveBOM(
        createBOMEffectiveDateContractSaveRequest({
          effectiveFrom: text,
          effectiveTo: '2030-12-31',
          masterDataControl: {
            ...dateContractWireBOM.masterDataControl,
            effectiveFrom: '2019-01-01',
            effectiveTo: '2030-12-31',
          },
        })
      )
      const [, options] = dateContractRequest.mock.calls[0]
      const payload = JSON.parse(String(options?.body))
      expect(options?.method).toBe('POST')
      expect(payload).not.toHaveProperty('effectiveFrom')
      expect(payload).not.toHaveProperty('effectiveTo')
      expect(payload.masterDataControl).toEqual(
        dateContractWireBOM.masterDataControl
      )
      expect(saved.effectiveFrom).toBe('2020-02-29')
      expect(saved.effectiveTo).toBe('2030-12-31')
      expect(saved.masterDataControl?.effectiveFrom).toBe('2020-02-29')
      expect(payload.relationSidecar.protocolDraft).toEqual({
        rootChildren: [],
        branchNodes: [],
        itemNodes: [],
      })
    }
  )

  it.each([
    '2023-02-29',
    '2020-04-31',
    '2020-01-01-extra',
    '2020-01-01T00:00:00Z',
  ])('rejects %s before any HTTP request', async (text) => {
    await expect(
      bomService.saveBOM(
        createBOMEffectiveDateContractSaveRequest({ effectiveFrom: text })
      )
    ).rejects.toThrow()
    expect(dateContractRequest).not.toHaveBeenCalled()
  })

  it('sends an explicit null when clearing an existing date instead of restoring its nested old value', async () => {
    dateContractRequest.mockResolvedValueOnce(
      Response.json({
        ...dateContractWireBOM,
        masterDataControl: { effectiveFrom: null },
      })
    )
    const saved = await bomService.saveBOM(
      createBOMEffectiveDateContractSaveRequest({
        effectiveFrom: '',
        masterDataControl: { effectiveFrom: '2020-02-29' },
      })
    )
    const payload = JSON.parse(
      String(dateContractRequest.mock.calls[0][1]?.body)
    )
    expect(payload.masterDataControl.effectiveFrom).toBeNull()
    expect(payload.masterDataControl).not.toHaveProperty('effectiveTo')
    expect(saved.effectiveFrom).toBeNull()
  })

  it('preserves omitted dates and converts nested-only date callers without dropping metadata', async () => {
    dateContractRequest.mockResolvedValueOnce(
      Response.json(dateContractWireBOM)
    )
    await bomService.saveBOM(
      createBOMEffectiveDateContractSaveRequest({
        masterDataControl: { revisionNo: 'R8', effectiveTo: '2030-12-31' },
      })
    )
    const payload = JSON.parse(
      String(dateContractRequest.mock.calls[0][1]?.body)
    )
    expect(payload.masterDataControl).toEqual({
      revisionNo: 'R8',
      effectiveTo: '2030-12-31T00:00:00Z',
    })
  })

  it('projects dates for detail, list and association consumers without shifting offset dates', async () => {
    const wireBOM = {
      ...dateContractWireBOM,
      masterDataControl: {
        effectiveFrom: '2020-02-29T00:00:00+08:00',
        effectiveTo: null,
      },
    }
    dateContractRequest.mockResolvedValueOnce(Response.json(wireBOM))
    dateContractRequest.mockResolvedValueOnce(
      Response.json({ items: [wireBOM], total: 1, page: 1, pageSize: 20 })
    )
    dateContractRequest.mockResolvedValueOnce(Response.json([wireBOM]))
    const detail = await bomService.getBOMById(wireBOM.id)
    const list = await bomService.getBOMs()
    const options = await bomService.getBOMAssociationOptions()
    for (const bom of [detail, list[0], options[0]]) {
      expect(bom.effectiveFrom).toBe('2020-02-29')
      expect(bom.effectiveTo).toBeNull()
    }
  })
})

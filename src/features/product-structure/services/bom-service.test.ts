import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bomService } from './bom-service'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

describe('bomService.saveBOM', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    apiFetchMock.mockResolvedValue({
      id: 'bom-1',
      bomNo: 'BOM-001',
      productId: 'product-1',
      bomVersion: 'V1.0',
      status: 'active',
      items: [],
      description: '',
      version: 1,
      revisionNo: 'R1',
      changeType: 'MANUAL',
      siteCode: '',
      isDefaultSite: true,
      effectiveFrom: null,
      effectiveTo: null,
    })
  })

  it('preserves relationSidecar in the save payload body', async () => {
    await bomService.saveBOM({
      data: {
        id: 'bom-1',
        bomNo: 'BOM-001',
        productId: 'product-1',
        bomVersion: 'V1.0',
        status: 'active',
        items: [],
        description: '',
        version: 1,
        revisionNo: 'R1',
        changeType: 'MANUAL',
        siteCode: '',
        isDefaultSite: true,
        effectiveFrom: null,
        effectiveTo: null,
        relationSidecar: {
          kind: 'parent_children_protocol',
          version: 'v1',
          protocolDraft: {
            rootChildren: ['branch:prepare'],
            branchNodes: [],
            itemNodes: [],
          },
        },
      },
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/engineering/bom', {
      method: 'POST',
      body: expect.any(String),
    })

    const body = JSON.parse(apiFetchMock.mock.calls[0][1].body as string)
    expect(body).toMatchObject({
      id: 'bom-1',
      bomNo: 'BOM-001',
      productId: 'product-1',
      bomVersion: 'V1.0',
      status: 'active',
      items: [],
      version: 1,
      revisionNo: 'R1',
      changeType: 'MANUAL',
      isDefaultSite: true,
      effectiveFrom: null,
      effectiveTo: null,
      relationSidecar: {
        kind: 'parent_children_protocol',
        version: 'v1',
        protocolDraft: {
          rootChildren: ['branch:prepare'],
          branchNodes: [],
          itemNodes: [],
        },
      },
    })
    expect(body).not.toHaveProperty('siteCode')
  })
})

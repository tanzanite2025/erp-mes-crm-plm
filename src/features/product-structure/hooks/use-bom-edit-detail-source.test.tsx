// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getBOMDetailSourceMock,
  failLoudlyMock,
} = vi.hoisted(() => ({
  getBOMDetailSourceMock: vi.fn(),
  failLoudlyMock: vi.fn(),
}))

vi.mock('@/lib/safe-catch', () => ({
  failLoudly: failLoudlyMock,
}))

vi.mock('../services/bom-service', () => ({
  bomService: {
    getBOMDetailSource: getBOMDetailSourceMock,
  },
}))

import { useBOMEditDetailSource } from './use-bom-edit-detail-source'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useBOMEditDetailSource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns error and fails loudly when edit detail succeeds without authoritative relation sidecar', async () => {
    getBOMDetailSourceMock.mockResolvedValue({
      bom: {
        id: 'bom-1',
        bomNo: 'BOM-001',
        productId: 'product-1',
        bomVersion: 'V1.0',
        status: 'active',
        items: [
          {
            id: 'item-1',
            section: 'PREPARE',
            materialId: 'mat-1',
            materialName: '材料 A',
            materialSpec: '',
            unitPrice: 12,
            unit: 'pcs',
            unitUsage: 1,
            wastagePercent: 0,
            standardUsage: 3,
            materialType: '',
            supplyChannel: '',
            substitutes: [],
          },
        ],
        description: '',
        version: 1,
        revisionNo: 'R1',
        changeType: 'MANUAL',
        isDefaultSite: true,
        siteCode: '',
        effectiveFrom: null,
        effectiveTo: null,
      },
      rawSource: {
        id: 'bom-1',
        protocolPayloadCandidate: {
          note: 'future-sidecar-slot',
        },
      },
    })

    const queryClient = createQueryClient()
    const { result } = renderHook(
      () => useBOMEditDetailSource({
        bomId: 'bom-1',
        open: true,
        isEdit: true,
        activeSections: [{ value: 'PREPARE', label: '备料', code: 'PREPARE', name: '备料', active: true, sortOrder: 1, isDefault: true, legacyNames: ['备料'] }],
        fields: [{ id: 'field-1' }],
        watchedItems: [{
          id: 'item-1',
          section: 'PREPARE',
          materialId: 'mat-1',
          materialName: '材料 A',
          materialSpec: '',
          unitPrice: 12,
          unit: 'pcs',
          unitUsage: 1,
          wastagePercent: 0,
          standardUsage: 3,
          materialType: '',
          supplyChannel: '',
          substitutes: [],
        }] as never,
      }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => {
      expect(result.current?.status).toBe('error')
    })

    expect(result.current).toEqual({
      status: 'error',
      error: expect.objectContaining({
        message: '[CRITICAL] BOM edit detail is missing authoritative relation sidecar',
      }),
      scope: 'useBOMEditDetailSource.authoritativeSidecar',
    })
    expect(getBOMDetailSourceMock).toHaveBeenCalledWith('bom-1')
    expect(failLoudlyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '[CRITICAL] BOM edit detail is missing authoritative relation sidecar',
      }),
      'useBOMEditDetailSource.authoritativeSidecar'
    )
  })

  it('returns ready detail source and merges authoritative protocol topology when relation sidecar is valid', async () => {
    getBOMDetailSourceMock.mockResolvedValue({
      bom: {
        id: 'bom-1',
        bomNo: 'BOM-001',
        productId: 'product-1',
        bomVersion: 'V1.0',
        status: 'active',
        items: [
          {
            id: 'item-1',
            section: 'PREPARE',
            materialId: 'mat-1',
            materialName: '材料 A',
            materialSpec: '',
            unitPrice: 12,
            unit: 'pcs',
            unitUsage: 1,
            wastagePercent: 0,
            standardUsage: 3,
            materialType: '',
            supplyChannel: '',
            substitutes: [],
          },
          {
            id: 'item-2',
            section: 'PREPARE',
            materialId: 'mat-2',
            materialName: '材料 B',
            materialSpec: '',
            unitPrice: 24,
            unit: 'pcs',
            unitUsage: 1,
            wastagePercent: 0,
            standardUsage: 5,
            materialType: '',
            supplyChannel: '',
            substitutes: [],
          },
        ],
        description: '',
        version: 1,
        revisionNo: 'R1',
        changeType: 'MANUAL',
        isDefaultSite: true,
        siteCode: '',
        effectiveFrom: null,
        effectiveTo: null,
      },
      rawSource: {
        id: 'bom-1',
        relationSidecar: {
          kind: 'parent_children_protocol',
          version: 'v1',
          protocolDraft: {
            rootChildren: ['branch:prepare'],
            branchNodes: [
              {
                id: 'branch:prepare',
                parentId: 'root',
                children: ['branch:prepare:main'],
                nodeKind: 'branch',
                branchRole: 'section',
                label: '备料拓扑',
                sectionCode: 'PREPARE',
                sectionName: '备料',
              },
              {
                id: 'branch:prepare:main',
                parentId: 'branch:prepare',
                children: ['auth:item-1'],
                nodeKind: 'branch',
                branchRole: 'collection',
                label: '主支路',
                sectionCode: 'PREPARE',
                sectionName: '备料',
              },
            ],
            itemNodes: [
              {
                id: 'auth:item-1',
                parentId: 'branch:prepare:main',
                children: [],
                nodeKind: 'item',
                sectionCode: 'PREPARE',
                itemId: 'item-1',
              },
            ],
          },
        },
      },
    })

    const queryClient = createQueryClient()
    const { result } = renderHook(
      () => useBOMEditDetailSource({
        bomId: 'bom-1',
        open: true,
        isEdit: true,
        activeSections: [{ value: 'PREPARE', label: '备料', code: 'PREPARE', name: '备料', active: true, sortOrder: 1, isDefault: true, legacyNames: ['备料'] }],
        fields: [{ id: 'field-1' }, { id: 'field-2' }],
        watchedItems: [{
          id: 'item-1',
          section: 'PREPARE',
          materialId: 'mat-1',
          materialName: '材料 A',
          materialSpec: '',
          unitPrice: 12,
          unit: 'pcs',
          unitUsage: 1,
          wastagePercent: 0,
          standardUsage: 3,
          materialType: '',
          supplyChannel: '',
          substitutes: [],
        }, {
          id: 'item-2',
          section: 'PREPARE',
          materialId: 'mat-2',
          materialName: '材料 B',
          materialSpec: '',
          unitPrice: 24,
          unit: 'pcs',
          unitUsage: 1,
          wastagePercent: 0,
          standardUsage: 5,
          materialType: '',
          supplyChannel: '',
          substitutes: [],
        }] as never,
      }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => {
      expect(result.current?.status).toBe('ready')
    })

    expect(result.current).toEqual({
      status: 'ready',
      data: {
        bom: expect.objectContaining({ id: 'bom-1' }),
        rawSource: expect.objectContaining({
          relationSidecar: expect.objectContaining({
            kind: 'parent_children_protocol',
            version: 'v1',
          }),
        }),
        protocolDraft: {
          rootChildren: ['branch:prepare'],
          branchNodes: [
            {
              id: 'branch:prepare',
              parentId: 'root',
              children: ['branch:prepare:main'],
              nodeKind: 'branch',
              branchRole: 'section',
              label: '备料拓扑',
              sectionCode: 'PREPARE',
              sectionName: '备料',
            },
            {
              id: 'branch:prepare:main',
              parentId: 'branch:prepare',
              children: ['auth:item-1', 'item:item-2'],
              nodeKind: 'branch',
              branchRole: 'collection',
              label: '主支路',
              sectionCode: 'PREPARE',
              sectionName: '备料',
            },
          ],
          itemNodes: [
            {
              id: 'auth:item-1',
              parentId: 'branch:prepare:main',
              children: [],
              nodeKind: 'item',
              sectionCode: 'PREPARE',
              sectionName: '备料',
              itemId: 'item-1',
            },
            {
              id: 'item:item-2',
              parentId: 'branch:prepare:main',
              children: [],
              nodeKind: 'item',
              sectionCode: 'PREPARE',
              sectionName: '备料',
              itemId: 'item-2',
            },
          ],
        },
      },
    })
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('returns error and fails loudly when edit detail query rejects', async () => {
    const error = new Error('detail load failed')
    getBOMDetailSourceMock.mockRejectedValue(error)

    const queryClient = createQueryClient()
    const { result } = renderHook(
      () => useBOMEditDetailSource({
        bomId: 'bom-1',
        open: true,
        isEdit: true,
        activeSections: [{ value: 'PREPARE', label: '备料', code: 'PREPARE', name: '备料', active: true, sortOrder: 1, isDefault: true, legacyNames: ['备料'] }],
        fields: [{ id: 'field-1' }],
        watchedItems: [] as never,
      }),
      { wrapper: createWrapper(queryClient) }
    )

    await waitFor(() => {
      expect(result.current?.status).toBe('error')
    })

    expect(result.current).toEqual({
      status: 'error',
      error,
      scope: 'useBOMEditDetailSource.detail',
    })
    expect(failLoudlyMock).toHaveBeenCalledWith(error, 'useBOMEditDetailSource.detail')
  })
})

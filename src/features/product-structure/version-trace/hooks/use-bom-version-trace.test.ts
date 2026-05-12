// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBOMVersionTrace } from './use-bom-version-trace'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}))

function buildHistoryRecords() {
  return [
    {
      id: 'record-1',
      bomId: 'bom-1',
      productId: 'product-1',
      bomNo: 'BOM-001',
      versionSequence: 2,
      displayVersionLabel: 'V1.1',
      operation: 'SAVE',
      status: 'active',
      description: 'latest',
      revisionNo: 'R2',
      effectiveFrom: undefined,
      effectiveTo: undefined,
      changeType: 'MANUAL',
      changeOrderNo: '',
      siteCode: '',
      isDefaultSite: false,
      createdAt: '2026-05-12T09:00:00.000Z',
      createdBy: 'tester',
    },
    {
      id: 'record-2',
      bomId: 'bom-2',
      productId: 'product-2',
      bomNo: 'BOM-002',
      versionSequence: 1,
      displayVersionLabel: 'V1.0',
      operation: 'SAVE',
      status: 'active',
      description: 'initial',
      revisionNo: 'R1',
      effectiveFrom: undefined,
      effectiveTo: undefined,
      changeType: 'MANUAL',
      changeOrderNo: '',
      siteCode: '',
      isDefaultSite: false,
      createdAt: '2026-05-11T09:00:00.000Z',
      createdBy: 'tester',
    },
  ]
}

describe('useBOMVersionTrace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
      if (queryKey[3] === 'detail') {
        return {
          data: undefined,
          isLoading: false,
          error: null,
        }
      }

      return {
        data: buildHistoryRecords(),
        isLoading: false,
        error: null,
      }
    })
  })

  it('enables global history query without bomId or productId', () => {
    const { result } = renderHook(() => useBOMVersionTrace({ open: true }))

    expect(useQueryMock).toHaveBeenCalledTimes(3)
    expect(useQueryMock.mock.calls[0]?.[0]?.queryKey).toEqual(['engineering', 'boms', 'version-history', '', ''])
    expect(useQueryMock.mock.calls[0]?.[0]?.enabled).toBe(true)
    expect(result.current.groups).toHaveLength(2)
    expect(result.current.activeBomId).toBe('bom-1')
    expect(result.current.hasAnyRecord).toBe(true)
  })

  it('keeps the global history query disabled when the workspace is not open', () => {
    renderHook(() => useBOMVersionTrace({ open: false }))

    expect(useQueryMock.mock.calls[0]?.[0]?.enabled).toBe(false)
  })

  it('filters history records by createdAt date window before deriving groups', () => {
    const { result } = renderHook(() =>
      useBOMVersionTrace({
        open: true,
        createdFrom: '2026-05-12',
        createdTo: '2026-05-12',
      })
    )

    expect(result.current.groups).toHaveLength(1)
    expect(result.current.activeBomId).toBe('bom-1')
    expect(result.current.activeRecords.map((record) => record.id)).toEqual(['record-1'])
    expect(result.current.hasAnyRecord).toBe(true)
  })

  it('returns empty history when the createdAt filter excludes all records', () => {
    const { result } = renderHook(() =>
      useBOMVersionTrace({
        open: true,
        createdTo: '2026-05-10',
      })
    )

    expect(result.current.groups).toHaveLength(0)
    expect(result.current.activeRecords).toEqual([])
    expect(result.current.hasAnyRecord).toBe(false)
  })
})

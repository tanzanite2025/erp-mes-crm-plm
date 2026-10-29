// @vitest-environment jsdom
import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { previewOrderTotals } from '@/lib/order-preview-calc'
import {
  createEmptySalesOrderDraft,
  createEmptySalesOrderLine,
  type SalesOrder,
  type SalesOrderFormValues,
} from '../data/schema'
import {
  toSalesOrderApiDTO,
  toSalesOrderContract,
} from '../sales/adapters/sales-order-api-adapter'
import { salesOrderLineApiDTOSchema } from '../sales/contracts/sales-order-api-dto'
import {
  sanitizeSalesOrderDelta,
  sanitizeSalesOrderSubmitValues,
} from '../utils/sales-order-submit'
import { useSalesOrderOps } from './use-sales-order-ops'

function createSalesOrderWithTwoPersistedLineIdentities(): SalesOrder {
  return {
    ...createEmptySalesOrderDraft('SO-1'),
    id: 'order-1',
    version: 4,
    createdAt: '2026-10-27T00:00:00Z',
    updatedAt: '2026-10-27T00:00:00Z',
    isDeleted: false,
    evidences: [],
    availableActions: [],
    lines: [
      { ...createEmptySalesOrderLine(), id: 101, lineNo: 1, amount: 20 },
      { ...createEmptySalesOrderLine(), id: 102, lineNo: 2, amount: 60 },
    ],
  }
}

describe('stable sales order line identities for production material sources', () => {
  it('preserves the surviving identity after removal and gives added lines no saved ID', () => {
    const { result } = renderHook(() => {
      const [order, setOrder] = useState<SalesOrderFormValues>(
        createSalesOrderWithTwoPersistedLineIdentities()
      )
      return { order, ...useSalesOrderOps(setOrder) }
    })
    act(() => result.current.handleRemoveLine(0))
    expect(
      result.current.order.lines.map(({ id, lineNo }) => ({ id, lineNo }))
    ).toEqual([{ id: 102, lineNo: 1 }])
    act(() => result.current.handleAddLine())
    act(() => result.current.updateLine(0, 'qty', 25))
    expect(result.current.order.lines[0].id).toBe(102)
    expect(result.current.order.lines[0].qty).toBe(25)
    expect(result.current.order.lines[1].id).toBeUndefined()
    expect(result.current.order.lines[1].lineNo).toBe(2)
    const submitted = sanitizeSalesOrderSubmitValues(result.current.order)
    expect(submitted.lines.map(({ id }) => id)).toEqual([102, undefined])
  })

  it('preserves identity through API decoding, display reordering and request encoding', () => {
    const original = createSalesOrderWithTwoPersistedLineIdentities()
    const decoded = toSalesOrderContract(toSalesOrderApiDTO(original))
    const reordered = previewOrderTotals([...decoded.lines].reverse()).lines
    const encoded = toSalesOrderApiDTO({ ...decoded, lines: reordered })
    expect(encoded.lines?.map(({ id, lineNo }) => ({ id, lineNo }))).toEqual([
      { id: 102, lineNo: 1 },
      { id: 101, lineNo: 2 },
    ])
  })

  it('matches delta baseline amounts by identity after reindexing instead of borrowing the previous row', () => {
    const original = createSalesOrderWithTwoPersistedLineIdentities()
    const nextLines = [
      { ...original.lines[1], lineNo: 1, amount: 999 },
      { ...createEmptySalesOrderLine(), lineNo: 2, amount: 999 },
    ]
    const delta = sanitizeSalesOrderDelta(
      { lines: { o: original.lines, n: nextLines } },
      original
    )
    expect(delta.lines.o).toEqual(original.lines)
    expect(delta.lines.n).toEqual([
      { ...nextLines[0], amount: 60 },
      { ...nextLines[1], amount: 0 },
    ])
  })

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid saved identity %s at the DTO boundary',
    (id) => {
      const line = createSalesOrderWithTwoPersistedLineIdentities().lines[0]
      expect(
        salesOrderLineApiDTOSchema.safeParse({ ...line, id }).success
      ).toBe(false)
    }
  )
})

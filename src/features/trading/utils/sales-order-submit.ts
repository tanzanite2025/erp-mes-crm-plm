import { type DeltaSet } from '@/lib/delta/types'
import {
  getTodaySalesOrderDate,
  type SalesOrder,
  type SalesOrderFormValues,
} from '../data/schema'

function sanitizeSalesOrderDeltaLines(
  lines: unknown,
  baselineAmountsByLineNo: Map<number, number>
) {
  if (!Array.isArray(lines)) {
    return lines
  }

  return lines.map((line) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      return line
    }

    const lineRecord = line as Record<string, unknown>
    const lineNoValue = lineRecord.lineNo
    const lineNo =
      typeof lineNoValue === 'number' ? lineNoValue : Number(lineNoValue)
    const baselineAmount = Number.isFinite(lineNo)
      ? (baselineAmountsByLineNo.get(lineNo) ?? 0)
      : 0

    return {
      ...lineRecord,
      amount: baselineAmount,
    }
  })
}

export function sanitizeSalesOrderSubmitValues(
  order: SalesOrderFormValues
): SalesOrderFormValues {
  const orderDate = order.orderDate?.trim() || getTodaySalesOrderDate()

  return {
    ...order,
    amount: 0,
    quantity: 0,
    orderDate,
    lines: (order.lines ?? []).map((line) => ({
      ...line,
      amount: 0,
      orderDate: line.orderDate?.trim() || orderDate,
    })),
  }
}

export function sanitizeSalesOrderDelta(
  delta: DeltaSet,
  order?: SalesOrder | null
): DeltaSet {
  const sanitizedDelta = Object.fromEntries(
    Object.entries(delta).filter(
      ([key]) => key !== 'amount' && key !== 'quantity'
    )
  ) as DeltaSet

  if (!sanitizedDelta.lines || !order) {
    return sanitizedDelta
  }

  const baselineAmountsByLineNo = new Map(
    (order.lines ?? []).map((line) => [line.lineNo, Number(line.amount) || 0])
  )
  const linesDelta = sanitizedDelta.lines

  sanitizedDelta.lines = {
    o: linesDelta.o,
    n: sanitizeSalesOrderDeltaLines(linesDelta.n, baselineAmountsByLineNo),
  }

  return sanitizedDelta
}

import { describe, expect, it } from 'vitest'
import {
  isLinearBarcodePrintableSalesOrder,
  LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES,
} from './use-linear-barcode-print-mgmt-model'

describe('linear barcode print sales order policy', () => {
  it('locks printable sales orders to the scheduling status', () => {
    expect(LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES).toEqual(['Scheduling'])
  })

  it('rejects voided and non-scheduling sales orders', () => {
    expect(isLinearBarcodePrintableSalesOrder({ status: 'Scheduling' })).toBe(true)
    expect(isLinearBarcodePrintableSalesOrder({ status: 'Canceled' })).toBe(false)
    expect(isLinearBarcodePrintableSalesOrder({ status: 'Pending' })).toBe(false)
    expect(isLinearBarcodePrintableSalesOrder(undefined)).toBe(false)
  })
})

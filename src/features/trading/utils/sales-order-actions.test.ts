import { describe, expect, it } from 'vitest'
import {
  canRegisterSalesOrderReceipt,
  isSalesOrderEditable,
  isSalesOrderSnapshotOnly,
} from './sales-order-actions'

describe('sales order action policy', () => {
  it('allows edits only while the sales order is still mutable', () => {
    expect(isSalesOrderEditable({ status: 'Draft' })).toBe(true)
    expect(isSalesOrderEditable({ status: 'Pending' })).toBe(true)
    expect(isSalesOrderEditable({ status: 'InProgress' })).toBe(false)
    expect(isSalesOrderEditable({ status: 'Done' })).toBe(false)
    expect(isSalesOrderEditable({ status: 'Canceled' })).toBe(false)
  })

  it('keeps canceled sales orders viewable but blocks receipt registration', () => {
    expect(canRegisterSalesOrderReceipt({ status: 'Pending' })).toBe(true)
    expect(canRegisterSalesOrderReceipt({ status: 'Canceled' })).toBe(false)
    expect(isSalesOrderSnapshotOnly({ status: 'Canceled' })).toBe(true)
  })
})

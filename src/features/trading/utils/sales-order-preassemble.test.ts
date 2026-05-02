import { describe, expect, it } from 'vitest'
import { isSalesOrderPreassembleScanAllowed } from './sales-order-preassemble'

describe('isSalesOrderPreassembleScanAllowed', () => {
  it('allows active sales order statuses', () => {
    expect(isSalesOrderPreassembleScanAllowed({ status: 'Draft' })).toBe(true)
    expect(isSalesOrderPreassembleScanAllowed({ status: 'Pending' })).toBe(true)
    expect(isSalesOrderPreassembleScanAllowed({ status: 'Scheduling' })).toBe(true)
    expect(isSalesOrderPreassembleScanAllowed({ status: 'InProgress' })).toBe(true)
  })

  it('blocks done, canceled, and missing orders', () => {
    expect(isSalesOrderPreassembleScanAllowed({ status: 'Done' })).toBe(false)
    expect(isSalesOrderPreassembleScanAllowed({ status: 'Canceled' })).toBe(false)
    expect(isSalesOrderPreassembleScanAllowed(null)).toBe(false)
    expect(isSalesOrderPreassembleScanAllowed(undefined)).toBe(false)
  })
})

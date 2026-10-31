import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCuttingIssuanceOrders } from '@/features/aps-scheduling/tabs/cutting-issuance/service'
import {
  LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES,
  isLinearBarcodePrintableSalesOrder,
} from '@/features/code-center/hooks/use-linear-barcode-print-mgmt-model'
import { loadAllActiveSalesOrdersForProductionMaterialRequirementSelection } from '@/features/mrp/services/production-material-requirement-order-selection-service'
import { getSalesOrders as getMrpSalesOrders } from '@/features/trading/sales'
import { getSalesOrders as getCuttingSalesOrders } from '@/features/trading/sales/services/sales-query-service'

vi.mock('@/features/trading/sales', () => ({ getSalesOrders: vi.fn() }))
vi.mock('@/features/trading/sales/services/sales-query-service', () => ({
  getSalesOrders: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

describe('confirmed order selection across production preparation', () => {
  it('requests the same active statuses in MRP, cutting and barcode printing', async () => {
    vi.mocked(getMrpSalesOrders).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 200,
    })
    vi.mocked(getCuttingSalesOrders).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    })
    await loadAllActiveSalesOrdersForProductionMaterialRequirementSelection()
    await getCuttingIssuanceOrders()
    const statuses = ['Pending', 'Scheduling', 'InProgress']
    expect(getMrpSalesOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: statuses })
    )
    expect(getCuttingSalesOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: statuses })
    )
    expect(LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES).toEqual(statuses)
    expect(isLinearBarcodePrintableSalesOrder({ status: 'Pending' })).toBe(true)
    expect(isLinearBarcodePrintableSalesOrder({ status: 'Scheduling' })).toBe(
      true
    )
    expect(isLinearBarcodePrintableSalesOrder({ status: 'InProgress' })).toBe(
      true
    )
    expect(isLinearBarcodePrintableSalesOrder({ status: 'Draft' })).toBe(false)
    expect(isLinearBarcodePrintableSalesOrder({ status: 'Canceled' })).toBe(
      false
    )
    expect(isLinearBarcodePrintableSalesOrder({ status: 'Done' })).toBe(false)
  })
})

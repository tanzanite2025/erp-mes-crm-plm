import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintRecordService } from './print-record-service'

const apiFetch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api-client', () => ({ apiFetch }))

const batchDto = {
  id: 'batch-1',
  batchNo: 'P20260719-010',
  templateName: 'SO-LINEAR-SO-001-L1',
  productId: '8bf75715-c08b-4a99-b192-3cb2d6883e21',
  startSn: '0001',
  endSn: '0002',
  salesOrderId: '9ae028c3-6540-4353-9240-d2385cd3b755',
  salesOrderLineNo: 1,
  quantity: 2,
  activatedCount: 0,
  status: 'Printed',
  expiresAt: '2026-08-18T00:00:00Z',
  createdAt: '2026-07-19T00:00:00Z',
  version: 1,
} as const

const inventoryDto = {
  id: 'item-1',
  batchId: batchDto.id,
  batchNo: batchDto.batchNo,
  productId: batchDto.productId,
  salesOrderId: batchDto.salesOrderId,
  salesOrderLineNo: 1,
  code: '26719011r140001',
  serialNumber: '0001',
  status: 'AVAILABLE',
  expiresAt: '2026-08-18T00:00:00Z',
  createdAt: '2026-07-19T00:00:00Z',
  version: 1,
} as const

describe('PrintRecordService linear barcode inventory', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  it('creates an atomic batch and normalizes every returned code', async () => {
    apiFetch.mockResolvedValue({
      batch: batchDto,
      items: [inventoryDto],
    })

    const result = await PrintRecordService.createLinearBarcodeBatch({
      salesOrderId: batchDto.salesOrderId,
      salesOrderLineNo: 1,
      quantity: 2,
    })

    expect(apiFetch).toHaveBeenCalledWith('/print-batches/linear-barcode', {
      method: 'POST',
      body: JSON.stringify({
        salesOrderId: batchDto.salesOrderId,
        salesOrderLineNo: 1,
        quantity: 2,
      }),
    })
    expect(result.batch.endSn).toBe('0002')
    expect(result.items[0]?.code).toBe('26719011R140001')
  })

  it('loads inventory scoped to a sales order', async () => {
    apiFetch.mockResolvedValue({ items: [inventoryDto], total: 1 })

    const result = await PrintRecordService.getLinearBarcodeInventory({
      salesOrderId: batchDto.salesOrderId,
      limit: 500,
    })

    expect(apiFetch).toHaveBeenCalledWith(
      `/print-batches/linear-barcode-inventory?salesOrderId=${batchDto.salesOrderId}&limit=500`
    )
    expect(result.total).toBe(1)
    expect(result.items[0]?.status).toBe('AVAILABLE')
  })
})

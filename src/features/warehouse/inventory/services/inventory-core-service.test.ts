import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { InventoryCoreService } from './inventory-core-service'

const inventoryItem = {
  id: 'inventory-1',
  materialId: 'material-1',
  materialName: 'Copper Wire',
  materialCode: 'MAT-001',
  materialCategory: 'RAW',
  materialSpec: 'Spec-A',
  onHand: 10,
  reserved: 2,
  availableQty: 8,
  quantity: 10,
  totalValue: 100,
  averageUnitCost: 10,
  categoryCode: 'WH_A',
  batchNo: 'B-001',
  uom: 'KG',
  version: 1,
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('InventoryCoreService', () => {
  it('loads inventory views from the locked paginated object protocol', async () => {
    apiFetchMock.mockResolvedValue({
      items: [inventoryItem],
      total: 1,
      page: 1,
      pageSize: 1000,
    })

    const result = await InventoryCoreService.getInventoryList()

    expect(apiFetchMock).toHaveBeenCalledWith('/inventory?page=1&pageSize=1000')
    expect(result).toHaveLength(1)
    expect(result[0]?.materialCode).toBe('MAT-001')
  })

  it('rejects inventory list payloads that omit items instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 1000,
    })

    await expect(InventoryCoreService.getInventoryList()).rejects.toThrow(
      '[INVALID_RESPONSE] InventoryCoreService.getInventoryList expected "items" to be an array.'
    )
  })

  it('rejects raw inventory payloads that omit items instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await expect(InventoryCoreService.getInventoryListRaw()).rejects.toThrow(
      '[INVALID_RESPONSE] InventoryCoreService.getInventoryListRaw expected "items" to be an array.'
    )
  })

  it('rejects inbound history payloads that omit items instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await expect(InventoryCoreService.getInboundHistory()).rejects.toThrow(
      '[INVALID_RESPONSE] InventoryCoreService.getInboundHistory expected "items" to be an array.'
    )
  })
})

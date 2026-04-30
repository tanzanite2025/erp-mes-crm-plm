import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  executeWarehouseCategoryTransaction,
  WarehouseCategoryMaintenanceService,
  WAREHOUSE_CATEGORY_INTENT_CREATE,
} from './warehouse-category-maintenance-service'
import type { WarehouseCategory } from '../data/schema'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

type WarehouseCategoryCreatePayload = Omit<WarehouseCategory, 'id' | 'version' | 'createdAt' | 'updatedAt'>

function createCategoryPayload(overrides: Partial<WarehouseCategoryCreatePayload> = {}): WarehouseCategoryCreatePayload {
  return {
    name: 'Finished Goods',
    code: 'FINISHED_TEST',
    description: 'Finished goods warehouse',
    isSystem: false,
    active: true,
    sortOrder: 10,
    allowInbound: true,
    allowShipment: true,
    allowStocktake: true,
    allowPurchaseReceipt: false,
    defaultForProductInbound: false,
    defaultForMaterialInbound: false,
    defaultForPurchaseReceipt: false,
    ...overrides,
  }
}

function createCategoryResponse(overrides: Partial<WarehouseCategory> = {}): WarehouseCategory {
  return {
    id: 'category-1',
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...createCategoryPayload(),
    ...overrides,
  }
}

describe('WarehouseCategoryMaintenanceService transaction contracts', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    apiFetchMock.mockResolvedValue(createCategoryResponse())
  })

  it('createCategory sends warehouse category create intent metadata', async () => {
    const payload = createCategoryPayload()

    await WarehouseCategoryMaintenanceService.createCategory(payload)

    expect(apiFetchMock).toHaveBeenCalledWith('/warehouse/categories', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        metadata: {
          intent: WAREHOUSE_CATEGORY_INTENT_CREATE,
        },
      }),
    })
  })

  it('executeWarehouseCategoryTransaction keeps actor metadata available', async () => {
    const payload = createCategoryPayload({ code: 'MATERIAL_TEST' })

    await executeWarehouseCategoryTransaction({
      intent: WAREHOUSE_CATEGORY_INTENT_CREATE,
      actorId: 'operator-1',
      payload,
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/warehouse/categories', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        metadata: {
          intent: WAREHOUSE_CATEGORY_INTENT_CREATE,
          actorId: 'operator-1',
        },
      }),
    })
  })
})

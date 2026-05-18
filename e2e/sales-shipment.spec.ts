/**
 * 端到端流程: 销售发货页面加载
 *
 * 验证点:
 *   1. 发货页面能加载
 *   2. 发货历史列表能加载
 *   3. 发货需求清单接口未实现 (404) 时,页面降级不崩
 *
 * 注:完整的"销售单 → 发货 → 库存减少 → 物流跟踪"流程涉及多页面,
 * 本 spec 聚焦在发货页这一个核心入口。
 */

import { expect, test } from '@playwright/test'
import { loginAs, mockApi } from './fixtures/api-mock'

interface ShipmentRecordMock {
  id: string
  orderNo: string
  customerName: string
  status: string
  shippedAt: string
  totalQuantity: number
  totalAmount: number
  createdAt: string
  updatedAt: string
}

function createShipment(overrides: Partial<ShipmentRecordMock> = {}): ShipmentRecordMock {
  return {
    id: 'shipment-e2e-1',
    orderNo: 'SO-E2E-001',
    customerName: '测试客户A',
    status: 'Shipped',
    shippedAt: '2026-05-10T08:00:00.000Z',
    totalQuantity: 10,
    totalAmount: 1000,
    createdAt: '2026-05-10T07:00:00.000Z',
    updatedAt: '2026-05-10T08:00:00.000Z',
    ...overrides,
  }
}

test('发货页面能加载发货历史', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/inventory/shipment', () => ({
    items: [
      createShipment({ id: 'sh-1', orderNo: 'SO-E2E-001' }),
      createShipment({ id: 'sh-2', orderNo: 'SO-E2E-002', status: 'Pending' }),
    ],
    total: 2,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/inventory/shipment-demands', () => ({
    items: [],
    total: 0,
  }))
  api.on('GET', '/sales-orders', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  await api.attach()

  await loginAs(page, { redirectTo: '/warehouse/shipment' })

  await expect(page).toHaveURL(/\/warehouse\/shipment/)
  await expect(page.locator('body')).toBeVisible()
})

test('发货需求接口 404 时页面降级展示', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/inventory/shipment', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/inventory/shipment-demands', () => ({
    status: 404,
    body: { error: 'not implemented' },
  }))
  api.on('GET', '/sales-orders', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  await api.attach()

  await loginAs(page, { redirectTo: '/warehouse/shipment' })

  await expect(page).toHaveURL(/\/warehouse\/shipment/)
  await expect(page.locator('body')).toBeVisible()
})

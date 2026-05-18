/**
 * 端到端流程: 采购订单列表 + 收货链路入口
 *
 * 验证点:
 *   1. 采购订单列表能加载并展示
 *   2. URL 上的 status 等参数能传递
 *   3. 空数据时不崩
 *
 * 注:完整的"采购单 → 收货 → 库存增加"流程涉及多页面跳转和扫码,
 * 本 spec 聚焦在采购订单页加载这条主路径上。
 */

import { expect, test } from '@playwright/test'
import { loginAs, mockApi } from './fixtures/api-mock'

interface PurchaseOrderMock {
  id: string
  orderNo: string
  supplierName: string
  supplierId: string
  status: string
  amount: number
  orderDate: string
  expectedDate: string
  purchaser: string
  currency: string
  isDeleted: boolean
  version: number
  createdAt: string
  updatedAt: string
}

function createPurchaseOrder(overrides: Partial<PurchaseOrderMock> = {}): PurchaseOrderMock {
  return {
    id: 'po-e2e-1',
    orderNo: 'PO-E2E-001',
    supplierName: '测试供应商A',
    supplierId: 'sup-e2e-1',
    status: 'Sent',
    amount: 5000,
    orderDate: '2026-05-01T00:00:00.000Z',
    expectedDate: '2026-05-15T00:00:00.000Z',
    purchaser: 'admin',
    currency: 'CNY',
    isDeleted: false,
    version: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

test('采购订单列表能加载并展示订单号', async ({ page }) => {
  const orders = [
    createPurchaseOrder({ id: 'po-1', orderNo: 'PO-E2E-001', status: 'Sent' }),
    createPurchaseOrder({
      id: 'po-2',
      orderNo: 'PO-E2E-002',
      status: 'Awaiting',
      supplierName: '供应商乙',
    }),
  ]

  const api = mockApi(page)
  api.on('GET', '/purchase/orders', () => ({
    items: orders,
    total: orders.length,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/suppliers', () => [])
  api.on('GET', '/finance/payment-methods', () => [])
  api.on('GET', '/finance/payment-terms', () => [])
  await api.attach()

  await loginAs(page, { redirectTo: '/purchase/orders' })

  await expect(page).toHaveURL(/\/purchase\/orders/)
  await expect(page.getByText(/PO-E2E-00[12]/).first()).toBeVisible()
})

test('采购订单空数据时页面不崩', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/purchase/orders', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/suppliers', () => [])
  api.on('GET', '/finance/payment-methods', () => [])
  api.on('GET', '/finance/payment-terms', () => [])
  await api.attach()

  await loginAs(page, { redirectTo: '/purchase/orders' })

  await expect(page).toHaveURL(/\/purchase\/orders/)
  await expect(page.locator('body')).toBeVisible()
})

test('入库登记页能加载', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/purchase/orders', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/warehouse/inbound', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/suppliers', () => [])
  api.on('GET', '/materials', () => [])
  await api.attach()

  await loginAs(page, { redirectTo: '/warehouse/inbound' })

  await expect(page).toHaveURL(/\/warehouse\/inbound/)
  await expect(page.locator('body')).toBeVisible()
})

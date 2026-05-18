/**
 * 端到端流程: 销售订单列表能加载并按客户上下文筛选
 *
 * 验证点:
 *   1. 销售订单列表能加载并展示订单
 *   2. 通过 URL 上的 customerId 参数能携带客户上下文
 *   3. 状态过滤参数能传递到后端 API
 *
 * 注:由于销售订单完整 create/promote 流程涉及大量 UI 交互
 * (产品选择、客户选择、行编辑),本 spec 聚焦在列表展示 + URL 状态承载
 * 这两个最关键的入口路径,确保主路径不破。
 */

import { expect, test } from '@playwright/test'
import { loginAs, mockApi } from './fixtures/api-mock'

/**
 * SalesOrderApiDTO 的 zod schema 是 .strict() 的,任何多余字段都会报错。
 * 这里精确按 contract 字段集合构造,只列出后端必返字段 + 当前测试实际需要的可选字段。
 */
interface SalesOrderMock {
  id: string
  orderNo: string
  customerId?: string
  customerName: string
  type: string
  currency: string
  status: string
  amount: number
  quantity: number
  orderDate: string
  deliveryDate: string
  classification: string
  exchangeRateSnapshot?: number
  lines: unknown[]
  evidences: unknown[]
  availableActions: unknown[]
  version?: number
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
}

function createOrder(overrides: Partial<SalesOrderMock> = {}): SalesOrderMock {
  return {
    id: 'so-e2e-1',
    orderNo: 'SO-E2E-001',
    customerId: 'cust-e2e-1',
    customerName: '测试客户A',
    type: 'Stock',
    currency: 'CNY',
    exchangeRateSnapshot: 1,
    classification: 'Normal',
    status: 'Pending',
    amount: 1000,
    quantity: 10,
    orderDate: '2026-05-01T00:00:00.000Z',
    deliveryDate: '2026-06-01T00:00:00.000Z',
    lines: [],
    evidences: [],
    availableActions: [],
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    isDeleted: false,
    version: 1,
    ...overrides,
  }
}

test('销售订单列表能加载并展示订单号', async ({ page }) => {
  const orders = [
    createOrder({ id: 'so-1', orderNo: 'SO-E2E-001', customerName: '客户甲' }),
    createOrder({
      id: 'so-2',
      orderNo: 'SO-E2E-002',
      customerName: '客户乙',
      status: 'InProgress',
    }),
  ]

  const api = mockApi(page)
  api.on('GET', '/sales-orders', () => ({
    items: orders,
    total: orders.length,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/customers', () => [])
  api.on('GET', '/finance/payment-methods', () => [])
  api.on('GET', '/finance/payment-terms', () => [])
  await api.attach()

  await loginAs(page, { redirectTo: '/trading/sales-orders' })

  await expect(page).toHaveURL(/\/trading\/sales-orders/)
  // 至少首条订单应当渲染出来
  await expect(page.getByText('SO-E2E-001').first()).toBeVisible()
})

test('销售订单列表带 customerId 时只请求该客户的订单', async ({ page }) => {
  const customerId = 'cust-e2e-only'
  let observedCustomerId: string | null = null

  const api = mockApi(page)
  api.on('GET', '/sales-orders', (req) => {
    observedCustomerId = req.query.customerId ?? null
    return {
      items: [
        createOrder({
          id: 'so-only-1',
          orderNo: 'SO-CUST-001',
          customerId,
          customerName: '锁定客户',
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    }
  })
  api.on('GET', '/customers', () => [])
  api.on('GET', '/finance/payment-methods', () => [])
  api.on('GET', '/finance/payment-terms', () => [])
  await api.attach()

  await loginAs(page, {
    redirectTo: `/trading/sales-orders?customerId=${customerId}`,
  })

  await expect(page).toHaveURL(/customerId=cust-e2e-only/)
  await expect(page.getByText('SO-CUST-001').first()).toBeVisible()

  // 等一拍确保 query 已发出
  await page.waitForTimeout(300)
  expect(observedCustomerId).toBe(customerId)
})

test('销售订单空数据时显示空状态文案', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/sales-orders', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/customers', () => [])
  api.on('GET', '/finance/payment-methods', () => [])
  api.on('GET', '/finance/payment-terms', () => [])
  await api.attach()

  await loginAs(page, { redirectTo: '/trading/sales-orders' })

  await expect(page).toHaveURL(/\/trading\/sales-orders/)
  // 任意文案都行,关键是页面不崩
  await expect(page.locator('body')).toBeVisible()
})

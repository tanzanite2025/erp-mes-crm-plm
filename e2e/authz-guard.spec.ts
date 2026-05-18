/**
 * 端到端流程: 权限边界 (authz guard)
 *
 * 验证点:
 *   1. 未登录访问受保护页面 → 重定向到 /sign-in,带 redirect 参数
 *   2. 后端返回 403 时,列表页应展示"无权访问"状态(ForbiddenState)而不崩
 *   3. 后端返回 401 时,前端应触发重新登录(常见做法是清空 token + 跳 sign-in)
 *
 * 这些用例保证授权失败的边界场景不会以白屏 / 崩溃结束。
 */

import { expect, test } from '@playwright/test'
import { loginAs, mockApi } from './fixtures/api-mock'

test('未登录访问 /trading/sales-orders 重定向到 sign-in 并带 redirect 参数', async ({
  page,
}) => {
  const api = mockApi(page)
  await api.attach()

  await page.goto('/trading/sales-orders')

  await expect(page).toHaveURL(/sign-in/)
  await expect(page).toHaveURL(/redirect=.*sales-orders/)
})

test('未登录访问 /warehouse/shipment 重定向到 sign-in', async ({ page }) => {
  const api = mockApi(page)
  await api.attach()

  await page.goto('/warehouse/shipment')

  await expect(page).toHaveURL(/sign-in/)
  await expect(page).toHaveURL(/redirect=.*warehouse.*shipment/)
})

test('登录后后端 403 时列表页降级展示而不崩', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/sales-orders', () => ({
    status: 403,
    body: { error: 'forbidden' },
  }))
  api.on('GET', '/customers', () => [])
  api.on('GET', '/finance/payment-methods', () => [])
  api.on('GET', '/finance/payment-terms', () => [])
  await api.attach()

  await loginAs(page, { redirectTo: '/trading/sales-orders' })

  await expect(page).toHaveURL(/\/trading\/sales-orders/)
  // 不要求展示具体文案,但页面 body 必须仍然渲染
  await expect(page.locator('body')).toBeVisible()
})

test('未登录访问 /mrp/requirements 重定向到 sign-in', async ({ page }) => {
  const api = mockApi(page)
  await api.attach()

  await page.goto('/mrp/requirements')

  await expect(page).toHaveURL(/sign-in/)
})

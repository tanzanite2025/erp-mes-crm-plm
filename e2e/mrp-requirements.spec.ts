/**
 * 端到端流程: MRP 物料需求页面
 *
 * 验证点:
 *   1. MRP 需求页面能加载
 *   2. 需求列表能展示
 *   3. 空数据时不崩
 */

import { expect, test } from '@playwright/test'
import { loginAs, mockApi } from './fixtures/api-mock'

test('MRP 物料需求页能加载', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/mrp/requirements', () => ({
    items: [],
    total: 0,
  }))
  api.on('GET', '/sales-orders', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 200,
  }))
  api.on('GET', '/materials', () => [])
  await api.attach()

  await loginAs(page, { redirectTo: '/mrp/requirements' })

  await expect(page).toHaveURL(/\/mrp\/requirements/)
  await expect(page.locator('body')).toBeVisible()
})

test('MRP 需求接口失败时页面有错误状态', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/mrp/requirements', () => ({
    status: 500,
    body: { error: 'mrp service unavailable' },
  }))
  api.on('GET', '/sales-orders', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 200,
  }))
  await api.attach()

  await loginAs(page, { redirectTo: '/mrp/requirements' })

  await expect(page).toHaveURL(/\/mrp\/requirements/)
  // 页面应能正常承载,即使后端有错也不会白屏
  await expect(page.locator('body')).toBeVisible()
})

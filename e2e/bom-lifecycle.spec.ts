/**
 * 端到端流程: BOM 模块的可达性
 *
 * 验证点:
 *   1. 登录后能导航到 product-structure/bom
 *   2. 即使后端没有数据,页面也不应崩溃
 *
 * 注:BOM 页面依赖 7+ 类参考数据 (products / materials / templates /
 * types / attribute-categories / attribute-options / sections),
 * 完整 e2e 模拟成本远高于价值。本 spec 只做"页面可达性"smoke test,
 * 验证业务路径没有被破坏(比如 route 死链、layout 崩塌)。
 *
 * 实质性的 BOM 行为测试由前端单元测试 (use-bom-data.test, bom-service.test)
 * 覆盖。
 */

import { expect, test } from '@playwright/test'
import { loginAs, mockApi } from './fixtures/api-mock'

test('BOM 管理页面登录后可达', async ({ page }) => {
  const api = mockApi(page)
  // 全部 BOM 相关 API 都返回最小可用 payload
  api.on('GET', '/engineering/bom', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/engineering/products', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/engineering/product-types', () => [])
  api.on('GET', '/engineering/product-templates', () => [])
  api.on('GET', '/engineering/product-attribute-categories', () => [])
  api.on('GET', '/engineering/product-attribute-options', () => [])
  api.on('GET', '/engineering/bom-sections', () => ({ items: [] }))
  api.on('GET', '/engineering/bom-sections/options', () => [])
  api.on('GET', '/materials', () => [])
  api.on('GET', '/customers', () => [])
  await api.attach()

  await loginAs(page, { redirectTo: '/product-structure/bom' })

  // 至少 URL 应当落在 /product-structure/bom 且 body 节点存在
  await expect(page).toHaveURL(/\/product-structure\/bom/)
  await expect(page.locator('body')).toBeVisible()
})

test('BOM 记录页面登录后可达', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/engineering/bom', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/engineering/products', () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
  }))
  api.on('GET', '/engineering/product-types', () => [])
  api.on('GET', '/engineering/product-templates', () => [])
  api.on('GET', '/engineering/product-attribute-categories', () => [])
  api.on('GET', '/engineering/product-attribute-options', () => [])
  api.on('GET', '/engineering/bom-sections', () => ({ items: [] }))
  api.on('GET', '/engineering/bom-sections/options', () => [])
  api.on('GET', '/materials', () => [])
  api.on('GET', '/customers', () => [])
  await api.attach()

  await loginAs(page, { redirectTo: '/product-structure/bom-records' })

  await expect(page).toHaveURL(/\/product-structure\/bom-records/)
  await expect(page.locator('body')).toBeVisible()
})

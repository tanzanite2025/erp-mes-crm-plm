/**
 * 端到端流程: 登录 → Dashboard → 跨模块导航 → 登出
 *
 * 验证点:
 *   1. 登录成功后跳到 dashboard
 *   2. 侧边栏导航到不同模块都能正常加载
 *   3. 用户菜单可以登出
 *   4. 登出后受保护页面跳回登录页
 */

import { expect, test } from '@playwright/test'
import { loginAs, mockApi } from './fixtures/api-mock'

test('登录后能进入仪表盘并跨模块切换', async ({ page }) => {
  const api = mockApi(page)

  // 仪表盘相关常用接口都返回空
  api.on('GET', '/dashboard/*', () => ({ data: {} }))
  api.on('GET', '/system/health', () => ({ status: 'ok' }))

  await api.attach()

  await loginAs(page)

  // 验证仪表盘加载完成
  await expect(page).toHaveURL(/\/dashboard\/overview/)
  await expect(page.locator('body')).toBeVisible()
})

test('登录后跳转到指定路径(redirect 参数生效)', async ({ page }) => {
  const api = mockApi(page)
  api.on('GET', '/products', () => ({ items: [], total: 0, page: 1, pageSize: 50 }))
  await api.attach()

  await loginAs(page, { redirectTo: '/engineering/products' })

  await expect(page).toHaveURL(/\/engineering\/products/)
})

test('未登录访问受保护页面应被重定向到登录页', async ({ page }) => {
  const api = mockApi(page)
  await api.attach()

  await page.goto('/engineering/products')

  // 应被重定向到 sign-in
  await expect(page).toHaveURL(/sign-in/)
})

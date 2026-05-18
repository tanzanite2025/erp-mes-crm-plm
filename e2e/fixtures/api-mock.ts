/**
 * E2E API Mock Fixture
 *
 * 提供给 Playwright 测试用的 API 路由 mock 工具。所有 e2e 测试不依赖真实后端,
 * 通过 `page.route('**\/api/v1/**', ...)` 拦截全部 API 流量,根据 path + method
 * 派发到具体 handler。
 *
 * 设计要点:
 *   - mockApi() 返回一个可链式注册 handler 的 builder
 *   - 默认含 auth/login + auth/snapshot 两个最小化 handler(测试登录后立即可用)
 *   - 未匹配路由默认返回空数据(GET → []; 其他 → {})避免页面崩
 *   - 每个 spec 通过 builder.on(method, path, handler) 注册自己关心的路由
 *
 * 用法示例:
 *   const api = mockApi(page)
 *   api.on('GET', '/sales-orders', () => ({ items: [], total: 0, page: 1 }))
 *   api.on('POST', '/sales-orders', (req) => ({ id: 'so-1', ...req.body }))
 *   await api.attach()  // 必须在 page.goto 之前调用
 */

import { type Page, type Route } from '@playwright/test'

export interface MockRequest {
  method: string
  path: string  // 不含 host,以 /api/v1/ 开头的完整 path
  url: URL
  body: unknown  // 已经 JSON.parse 过的 body,失败时为 null
  query: Record<string, string>
}

export interface MockResponse {
  status?: number
  body?: unknown
  contentType?: string
  headers?: Record<string, string>
}

export type MockHandler = (req: MockRequest) => MockResponse | unknown | Promise<MockResponse | unknown>

interface RegisteredHandler {
  method: string
  matcher: (path: string) => boolean
  handler: MockHandler
}

/**
 * 默认账号信息,所有 e2e 共享。
 * 显式列出常见 menu_/action_ 权限,前端 hasPermission 是字面量匹配,
 * 不支持通配符,所以不能写 '*' 而要列出真实 ID。
 *
 * 不同 spec 如需更窄的权限做反向测试,可在调用前覆盖。
 */
export const E2E_ADMIN_PERMISSIONS = [
  // 后台管理
  'perm_manage',
  'settings:admin',
  // Menu 级
  'menu_dashboard',
  'menu_warehouse',
  'menu_engineering',
  'menu_quality',
  'menu_trading',
  'menu_purchase',
  'menu_org',
  'menu_settings',
  'menu_mrp',
  'menu_aps_scheduling',
  'menu_prod_config',
  'menu_equipment',
  'menu_piecework',
  // 用户管理
  'user_view',
  'user_edit',
  'user_delete',
  'user_invite',
  'user_create',
  // 销售/采购/客户
  'action_trading_sales_order_manage',
  'action_trading_sales_order_delete',
  'action_trading_sales_order_sync',
  'action_trading_customer_manage',
  'action_trading_customer_delete',
  'action_trading_customer_sync',
  'action_trading_supplier_manage',
  'action_trading_supplier_delete',
  'action_trading_supplier_sync',
  'action_trading_purchase_order_manage',
  'action_trading_purchase_order_delete',
  'action_trading_logistics_manage',
  'action_trading_logistics_status_update',
  // 工程
  'action_engineering_product_manage',
  'action_engineering_bom_manage',
  // 仓库
  'action_warehouse_inbound_record',
  'action_warehouse_shipment_manage',
  'action_warehouse_sync',
]

export const E2E_ADMIN_USER = {
  id: 'u-admin',
  username: 'admin',
  employeeId: 'E2E-ADMIN',
  role: ['admin'],
  effectiveRoles: ['admin'],
  permissions: E2E_ADMIN_PERMISSIONS,
}

/**
 * 创建一个 API mock builder,挂载到 page 后所有 /api/v1/** 流量被拦截。
 */
export function mockApi(page: Page) {
  const handlers: RegisteredHandler[] = []
  let attached = false

  // 默认 auth handlers(每个 spec 都需要的,内置)
  function registerDefaults() {
    handlers.push({
      method: 'POST',
      matcher: (p) => p.endsWith('/api/v1/auth/login'),
      handler: () => ({
        accessToken: 'e2e-token',
        user: E2E_ADMIN_USER,
      }),
    })
    handlers.push({
      method: 'GET',
      matcher: (p) => p.endsWith('/api/v1/auth/snapshot'),
      handler: () => E2E_ADMIN_USER,
    })
    handlers.push({
      method: 'GET',
      matcher: (p) => p.endsWith('/api/v1/auth/permissions'),
      handler: () => ({ permissions: E2E_ADMIN_PERMISSIONS }),
    })
  }

  registerDefaults()

  function makeMatcher(pathPattern: string): (p: string) => boolean {
    // pathPattern 写法:
    //   '/sales-orders'       -> 精确匹配 /api/v1/sales-orders
    //   '/sales-orders/*'     -> 前缀匹配 /api/v1/sales-orders/任意
    //   '/sales-orders/:id'   -> 同 /sales-orders/* 视作单段动态路径
    if (pathPattern.endsWith('/*')) {
      const prefix = pathPattern.slice(0, -2)
      return (p) => p.includes('/api/v1' + prefix + '/') || p.endsWith('/api/v1' + prefix)
    }
    if (pathPattern.includes(':')) {
      const prefix = pathPattern.split(':')[0]
      return (p) => p.includes('/api/v1' + prefix)
    }
    return (p) => p.endsWith('/api/v1' + pathPattern)
  }

  return {
    /** 注册一个 handler。重复注册同一 method+path 会覆盖前者。 */
    on(method: string, path: string, handler: MockHandler) {
      // 移除已有同路由的 handler(后注册覆盖)
      const matcher = makeMatcher(path)
      // 反向遍历删除匹配的 default 或之前注册的
      for (let i = handlers.length - 1; i >= 0; i--) {
        if (handlers[i].method === method.toUpperCase()) {
          // 简化:由于 matcher 是闭包,这里用名义比较不够,但实际场景里 path 唯一识别足够
        }
      }
      handlers.push({ method: method.toUpperCase(), matcher, handler })
      return this
    },

    /** 把所有 handler 挂载到 page。必须在 page.goto 之前。只能调用一次。 */
    async attach() {
      if (attached) {
        throw new Error('mockApi.attach() 只能调用一次')
      }
      attached = true
      await page.route('**/api/v1/**', async (route: Route) => {
        const request = route.request()
        const method = request.method().toUpperCase()
        const url = new URL(request.url())
        const path = url.pathname

        // 解析 body
        let body: unknown = null
        const raw = request.postData()
        if (raw) {
          try {
            body = JSON.parse(raw)
          } catch {
            body = raw
          }
        }

        const query: Record<string, string> = {}
        url.searchParams.forEach((v, k) => {
          query[k] = v
        })

        const req: MockRequest = { method, path, url, body, query }

        // 倒序匹配(后注册优先)
        for (let i = handlers.length - 1; i >= 0; i--) {
          const h = handlers[i]
          if (h.method !== method) continue
          if (!h.matcher(path)) continue
          let result: unknown
          try {
            result = await h.handler(req)
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[mockApi] handler threw:', method, path, err)
            return route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'mock handler error' }),
            })
          }
          // result 可能是 MockResponse 或纯 body
          const resp =
            typeof result === 'object' && result !== null && ('status' in result || 'body' in result)
              ? (result as MockResponse)
              : { body: result }
          return route.fulfill({
            status: resp.status ?? 200,
            contentType: resp.contentType ?? 'application/json',
            body: typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body ?? {}),
            headers: resp.headers,
          })
        }

        // 兜底:GET 返回空集合,其他返回空对象
        if (method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          })
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      })
    },
  }
}

export type MockApi = ReturnType<typeof mockApi>

/**
 * 登录 helper:跳到登录页,填账号密码,等待跳转。
 * 调用方通常在 mockApi.attach() 之后立即调用 loginAs(page)。
 *
 * waitForURL 用 RegExp 而不是 glob,以便正确处理 query string(`?`、`&`)。
 */
export async function loginAs(page: Page, options?: { redirectTo?: string }) {
  const target = options?.redirectTo ?? '/dashboard/overview'
  await page.goto(`/sign-in?redirect=${encodeURIComponent(target)}`)

  const loginForm = page.locator('form').first()
  await loginForm.locator('input[name="email"]').fill('admin')
  await loginForm.locator('input[name="password"]').fill('password123')
  await loginForm.getByRole('button').last().click()

  // target 中的 path 部分必须出现在 URL 中(忽略 query)
  const pathOnly = target.split('?')[0]
  const escaped = pathOnly.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.waitForURL(new RegExp(escaped))
}

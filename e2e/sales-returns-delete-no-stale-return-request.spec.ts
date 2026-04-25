import { expect, test } from '@playwright/test'

type SalesReturnMock = {
  id: string
  returnNo: string
  salesOrderId: string
  salesOrderNo: string
  customerId: string
  customerName: string
  status: string
  trackingNo: string
  carrier: string
  shippedAt: string | null
  trackingFilledAt: string | null
  trackingFilledBy: string
  logisticsNote: string
  pendingTrackingFill: boolean
  returnDate: string
  issueCategory: string
  reason: string
  remarks: string
  actualReturnAmount: number
  actualReturnAmountNote: string
  actualReturnAmountEvidences: unknown[]
  actualReturnAmountRecordedAt: string | null
  actualReturnAmountRecordedBy: string
  evidences: unknown[]
  operator: string
  totalQuantity: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  lines: unknown[]
}

function createSalesReturn(): SalesReturnMock {
  return {
    id: 'sr-delete-e2e-1',
    returnNo: 'SR-E2E-001',
    salesOrderId: 'so-e2e-1',
    salesOrderNo: 'SO-E2E-001',
    customerId: 'cust-e2e-1',
    customerName: '客户A',
    status: 'Created',
    trackingNo: '',
    carrier: '',
    shippedAt: null,
    trackingFilledAt: null,
    trackingFilledBy: '',
    logisticsNote: '',
    pendingTrackingFill: true,
    returnDate: '2026-04-25T00:00:00.000Z',
    issueCategory: 'Damage',
    reason: '表面异常',
    remarks: 'e2e',
    actualReturnAmount: 0,
    actualReturnAmountNote: '',
    actualReturnAmountEvidences: [],
    actualReturnAmountRecordedAt: null,
    actualReturnAmountRecordedBy: '',
    evidences: [],
    operator: 'tester',
    totalQuantity: 2,
    totalAmount: 25,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    lines: [],
  }
}

test('sales returns delete clears returnId and stops requesting deleted return detail/history', async ({
  page,
}) => {
  const salesReturn = createSalesReturn()
  let deletedReturnId: string | null = null
  let deletedDetailRequestCount = 0
  let deletedHistoryRequestCount = 0

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const path = url.pathname

    const json = (payload: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      })

    if (path.endsWith('/api/v1/auth/login') && method === 'POST') {
      return json({
        accessToken: 'sales-returns-e2e-token',
        user: {
          id: 'u-admin',
          username: 'admin',
          employeeId: 'E2E-SR-001',
          role: ['admin'],
          effectiveRoles: ['admin'],
          permissions: [
            'settings:admin',
            'menu_trading',
            'action_trading_sales_order_delete',
            'action_trading_sales_order_manage',
          ],
        },
      })
    }

    if (path.endsWith('/api/v1/auth/snapshot') && method === 'GET') {
      return json({
        id: 'u-admin',
        username: 'admin',
        employeeId: 'E2E-SR-001',
        effectiveRoles: ['admin'],
        permissions: [
          'settings:admin',
          'menu_trading',
          'action_trading_sales_order_delete',
          'action_trading_sales_order_manage',
        ],
      })
    }

    if (path.endsWith('/api/v1/sales-orders') && method === 'GET') {
      return json({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
      })
    }

    if (path.endsWith('/api/v1/sales-returns') && method === 'GET') {
      return json({
        items: deletedReturnId ? [] : [salesReturn],
        total: deletedReturnId ? 0 : 1,
        page: 1,
        pageSize: 20,
      })
    }

    if (path.endsWith(`/api/v1/sales-returns/${salesReturn.id}`) && method === 'GET') {
      if (deletedReturnId === salesReturn.id) {
        deletedDetailRequestCount += 1
        return json({ error: '销售退货单不存在' }, 404)
      }
      return json(salesReturn)
    }

    if (
      path.endsWith(`/api/v1/sales-returns/${salesReturn.id}/actual-amount-records`) &&
      method === 'GET'
    ) {
      if (deletedReturnId === salesReturn.id) {
        deletedHistoryRequestCount += 1
        return json({ error: '销售退货单不存在' }, 404)
      }
      return json([])
    }

    if (path.endsWith(`/api/v1/sales-returns/${salesReturn.id}`) && method === 'DELETE') {
      deletedReturnId = salesReturn.id
      return route.fulfill({
        status: 204,
        body: '',
      })
    }

    if (method === 'GET') {
      return json({ data: [] })
    }

    return json({})
  })

  await page.goto(
    '/sign-in?redirect=%2Ftrading%2Fsales-returns%3FreturnId%3Dsr-delete-e2e-1'
  )

  const loginForm = page.locator('form').first()
  await loginForm.locator('input[name="email"]').fill('admin')
  await loginForm.locator('input[name="password"]').fill('password123')
  await loginForm.getByRole('button').last().click()

  await page.waitForURL('**/trading/sales-returns**')
  const returnCard = page.locator('[role="button"]').filter({
    hasText: 'SR-E2E-001',
  })
  await expect(returnCard).toHaveCount(1)
  await expect(page.getByText('退货编辑与补录面板')).toBeVisible()

  await returnCard.getByRole('button', { name: '删除退货单', exact: true }).click()
  await expect(page.getByText('确认删除销售退货单')).toBeVisible()
  await page.getByRole('button', { name: '确认删除' }).click()

  await expect(page.getByText('销售退货单已删除')).toBeVisible()
  await expect(page).not.toHaveURL(/returnId=/)
  await expect(page.getByText('尚未选择销售退货单')).toBeVisible()
  await expect(returnCard).toHaveCount(0)

  await page.waitForTimeout(800)

  expect(deletedDetailRequestCount).toBe(0)
  expect(deletedHistoryRequestCount).toBe(0)
})

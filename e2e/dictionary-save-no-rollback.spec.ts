import { expect, test } from '@playwright/test'

test('dictionary entry save does not rollback after refresh', async ({ page }) => {
  const group = {
    id: 'grp-brake',
    name: '刹车规格',
    code: 'BRAKE_GROUP',
    description: '',
    active: true,
    isSystem: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  const seedEntry = {
    id: 'entry-brake-type',
    groupId: group.id,
    label: '刹车类型',
    code: 'BRAKE_TYPE',
    description: '',
    options: [{ label: 'Disc (碟刹)', value: 'DISC' }],
    sortOrder: 0,
    active: true,
    isSystem: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  const entries = [seedEntry]

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
        accessToken: 'e2e-token',
        user: {
          id: 'u-admin',
          username: 'admin',
          employeeId: 'E2E-001',
          role: ['admin'],
          effectiveRoles: ['admin'],
          permissions: ['settings:admin'],
        },
      })
    }

    if (path.endsWith('/api/v1/auth/snapshot') && method === 'GET') {
      return json({
        id: 'u-admin',
        username: 'admin',
        employeeId: 'E2E-001',
        effectiveRoles: ['admin'],
        permissions: ['settings:admin'],
      })
    }

    if (path.endsWith('/api/v1/dictionary/groups') && method === 'GET') {
      return json([group])
    }

    if (path.endsWith('/api/v1/dictionary/entries') && method === 'GET') {
      return json(entries)
    }

    if (path.endsWith('/api/v1/dictionary/entries') && method === 'POST') {
      const payload = JSON.parse(request.postData() ?? '{}') as {
        groupId: string
        label: string
        code: string
        description?: string
        options?: Array<{ label: string; value: string }>
        sortOrder?: number
        active?: boolean
      }

      const created = {
        id: `entry-${payload.code.toLowerCase()}`,
        groupId: payload.groupId,
        label: payload.label,
        code: payload.code,
        description: payload.description ?? '',
        options: payload.options ?? [],
        sortOrder: payload.sortOrder ?? 0,
        active: payload.active ?? true,
        isSystem: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:01.000Z',
      }

      entries.push(created)
      return json(created)
    }

    if (method === 'GET') {
      return json({ data: [] })
    }

    return json({})
  })

  await page.goto('/sign-in?redirect=%2Fbasic-settings%2Fdictionary')

  const loginForm = page.locator('form').first()
  await loginForm.locator('input[name="email"]').fill('admin')
  await loginForm.locator('input[name="password"]').fill('password123')
  await loginForm.getByRole('button').last().click()

  await page.waitForURL('**/basic-settings/dictionary')
  await expect(page.getByText('刹车类型')).toBeVisible()
  await expect(page.getByText('Drum (鼓刹)')).toHaveCount(0)

  await page.getByRole('button', { name: /ADD_ENTRY/i }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/ATTRIBUTE_DEFINITION/i)).toBeVisible()

  await dialog.locator('input').first().fill('制动形式')

  await dialog.locator('textarea').fill('Disc (碟刹)|DISC\nDrum (鼓刹)|DRUM')
  await dialog.getByRole('button', { name: /CONFIRM_SAVE/i }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Drum (鼓刹)')).toBeVisible()

  await page.waitForTimeout(1500)
  await expect(page.getByText('Drum (鼓刹)')).toBeVisible()
})

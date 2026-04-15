import { expect, test } from '@playwright/test'

type VehicleSpecMock = {
  id: string
  category: 'van' | 'boxTruck' | 'lightTruck' | 'mediumTruck'
  name: string
  payloadKg: number
  volumeM3: number
  nominalVolumeM3: number
  physicalInnerSize: {
    lengthMm: number
    widthMm: number
    heightMm: number
  }
  usableInnerSize: {
    lengthMm: number
    widthMm: number
    heightMm: number
  }
  safetyAllowance: {
    topClearanceMm: number
    sideClearanceMm: number
    rearClearanceMm: number
  }
  loadingConstraint: {
    doorWidthMm: number
    doorHeightMm: number
    wheelArchWidthMm: number
    wheelArchHeightMm: number
    hasCenterPillar: boolean
  }
  photoEntry: {
    vehicleId: string
    displayTitle: string
    description?: string
    coverImageUrl?: string
    tags: string[]
    images: Array<{
      id: string
      version: number
      url: string
      alt: string
      viewType: 'exterior' | 'sideDoorOpen' | 'rearDoorInterior'
      caption?: string
      annotations: Array<{
        id: string
        xPercent: number
        yPercent: number
        title: string
        description: string
        tag?: string
      }>
    }>
  }
  isBoxBody: boolean
  enabled: boolean
  notes: string
}

type VehicleContactBindingMock = {
  id: string
  vehicleId: string
  vehicleName: string
  category: 'van' | 'boxTruck' | 'lightTruck' | 'mediumTruck'
  supplierName?: string
  contactName: string
  channels: Array<{
    type: 'phone' | 'wechat' | 'email' | 'whatsapp' | 'other'
    value: string
    primary?: boolean
  }>
  region?: string
  dispatchAdvice?: string
  note?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

function createVehicleSpec(): VehicleSpecMock {
  return {
    id: 'veh-van-001',
    category: 'van',
    name: '金杯面包车',
    payloadKg: 1200,
    volumeM3: 8.6,
    nominalVolumeM3: 9.2,
    physicalInnerSize: {
      lengthMm: 3200,
      widthMm: 1650,
      heightMm: 1650,
    },
    usableInnerSize: {
      lengthMm: 3000,
      widthMm: 1550,
      heightMm: 1550,
    },
    safetyAllowance: {
      topClearanceMm: 80,
      sideClearanceMm: 50,
      rearClearanceMm: 120,
    },
    loadingConstraint: {
      doorWidthMm: 1400,
      doorHeightMm: 1450,
      wheelArchWidthMm: 1180,
      wheelArchHeightMm: 320,
      hasCenterPillar: false,
    },
    photoEntry: {
      vehicleId: 'veh-van-001',
      displayTitle: '金杯面包车',
      description: '联系人页 e2e mock 车型',
      coverImageUrl: '',
      tags: ['contacts'],
      images: [],
    },
    isBoxBody: true,
    enabled: true,
    notes: 'playwright mock',
  }
}

function createContactBindings(): VehicleContactBindingMock[] {
  return [
    {
      id: 'binding-zhangsan',
      vehicleId: 'veh-van-001',
      vehicleName: '金杯面包车',
      category: 'van',
      supplierName: '华南承运商',
      contactName: '张三',
      channels: [{ type: 'phone', value: '13800138000', primary: true }],
      region: '广州',
      dispatchAdvice: '优先安排上午提货',
      note: '首选联系人',
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'binding-lisi',
      vehicleId: 'veh-van-001',
      vehicleName: '金杯面包车',
      category: 'van',
      supplierName: '华东承运商',
      contactName: '李四',
      channels: [{ type: 'phone', value: '13900139000', primary: true }],
      region: '上海',
      dispatchAdvice: '晚班司机优先',
      note: '备用联系人',
      enabled: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}

test('contacts page reloads list after toggle and delete', async ({ page }) => {
  const vehicleSpecs = [createVehicleSpec()]
  const bindings = createContactBindings()

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
        accessToken: 'contacts-e2e-token',
        user: {
          id: 'u-admin',
          username: 'admin',
          employeeId: 'E2E-002',
          role: ['admin'],
          effectiveRoles: ['admin'],
          permissions: ['settings:admin', 'menu_trading'],
        },
      })
    }

    if (path.endsWith('/api/v1/auth/snapshot') && method === 'GET') {
      return json({
        id: 'u-admin',
        username: 'admin',
        employeeId: 'E2E-002',
        effectiveRoles: ['admin'],
        permissions: ['settings:admin', 'menu_trading'],
      })
    }

    if (path.endsWith('/api/v1/logistics-config/vehicle-specs') && method === 'GET') {
      return json(vehicleSpecs)
    }

    if (path.endsWith('/api/v1/shipping-management/vehicle-contacts') && method === 'GET') {
      return json(bindings)
    }

    if (/\/api\/v1\/shipping-management\/vehicle-contacts\/[^/]+$/.test(path) && method === 'POST') {
      const bindingId = path.split('/').at(-1)
      const payload = JSON.parse(request.postData() ?? '{}') as {
        enabled?: boolean
      }
      const target = bindings.find((item) => item.id === bindingId)
      if (target) {
        target.enabled = payload.enabled ?? target.enabled
        target.updatedAt = '2026-01-01T00:00:01.000Z'
      }
      return json(target ?? {})
    }

    if (/\/api\/v1\/shipping-management\/vehicle-contacts\/[^/]+$/.test(path) && method === 'DELETE') {
      const bindingId = path.split('/').at(-1)
      const targetIndex = bindings.findIndex((item) => item.id === bindingId)
      if (targetIndex >= 0) {
        bindings.splice(targetIndex, 1)
      }
      return json({ success: true })
    }

    if (method === 'GET') {
      return json({ data: [] })
    }

    return json({})
  })

  await page.goto('/sign-in?redirect=%2Fshipping-management%2Fcontacts')

  const loginForm = page.locator('form').first()
  await loginForm.locator('input[name="email"]').fill('admin')
  await loginForm.locator('input[name="password"]').fill('password123')
  await loginForm.getByRole('button').last().click()

  await page.waitForURL('**/shipping-management/contacts')
  await expect(page.getByText('车型联系人管理')).toBeVisible()
  await expect(page.getByText('张三')).toBeVisible()
  await expect(page.getByText('李四')).toBeVisible()
  await expect(page.getByRole('button', { name: '停用' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: '启用' })).toHaveCount(1)

  await page.getByRole('button', { name: '停用' }).click()

  await expect(page.getByText('保存成功')).toBeVisible()
  await expect(page.getByRole('button', { name: '启用' })).toHaveCount(2)
  await expect(page.getByRole('button', { name: '停用' })).toHaveCount(0)

  await page.getByRole('button', { name: '删除' }).nth(1).click()
  await expect(page.getByText('确认删除联系人')).toBeVisible()
  await page.getByRole('button', { name: '确认删除' }).click()

  await expect(page.getByText('删除成功')).toBeVisible()
  await expect(page.getByText('李四')).toHaveCount(0)
  await expect(page.getByText('张三')).toBeVisible()
  await expect(page.getByRole('button', { name: '删除' })).toHaveCount(1)
})

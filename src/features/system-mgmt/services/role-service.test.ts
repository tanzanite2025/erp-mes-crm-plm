import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { deleteRole, fetchRoles, upsertRole } from './role-service'

describe('role-service contract regression', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('fetchRoles parses array contract and normalizes missing permissions', async () => {
    apiFetchMock.mockResolvedValue([
      {
        id: 'finance-manager',
        label: '财务经理',
        color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      },
      {
        id: 'ops-admin',
        label: '运维管理员',
        permissions: ['menu_org'],
      },
    ])

    const result = await fetchRoles()

    expect(apiFetchMock).toHaveBeenCalledWith('/roles')
    expect(result).toEqual([
      {
        id: 'finance-manager',
        label: '财务经理',
        color: 'bg-blue-500/10 text-blue-600 border-blue-200',
        permissions: [],
      },
      {
        id: 'ops-admin',
        label: '运维管理员',
        color: undefined,
        permissions: ['menu_org'],
      },
    ])
  })

  it('upsertRole sends backend-aligned payload and parses object response', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'finance-manager',
      label: '财务经理',
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      permissions: ['menu_trading', 'action_trading_sales_order_manage'],
    })

    const result = await upsertRole({
      id: 'finance-manager',
      label: '财务经理',
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      permissions: ['menu_trading', 'action_trading_sales_order_manage'],
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/roles', {
      method: 'POST',
      body: JSON.stringify({
        id: 'finance-manager',
        label: '财务经理',
        color: 'bg-blue-500/10 text-blue-600 border-blue-200',
        permissions: ['menu_trading', 'action_trading_sales_order_manage'],
      }),
    })
    expect(result.permissions).toEqual(['menu_trading', 'action_trading_sales_order_manage'])
  })

  it('deleteRole calls encoded delete endpoint', async () => {
    apiFetchMock.mockResolvedValue({ message: 'role deleted' })

    await deleteRole('finance manager')

    expect(apiFetchMock).toHaveBeenCalledWith('/roles/finance%20manager', {
      method: 'DELETE',
    })
  })
})

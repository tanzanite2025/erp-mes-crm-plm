import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bulkDeleteUsers,
  createUser,
  fetchUserOptions,
  fetchUserPermissions,
  replaceUser,
  replaceUserPermissions,
} from './user-api'

const apiFetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

describe('user api contracts', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('loads selector data from the minimal options endpoint', async () => {
    apiFetchMock.mockResolvedValue([
      {
        id: 'user-1',
        username: 'buyer',
        employeeId: 'employee-1',
        isProtected: false,
        role: 'buyer',
        status: 'active',
      },
    ])

    await expect(
      fetchUserOptions({ status: 'active', role: ['buyer', 'approver'] })
    ).resolves.toEqual([
      {
        id: 'user-1',
        username: 'buyer',
        employeeId: 'employee-1',
        firstName: undefined,
        lastName: undefined,
        isProtected: false,
        role: 'buyer',
        status: 'active',
      },
    ])
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/users/options?status=active&role=buyer&role=approver'
    )
  })

  it('sends the final admin challenge with the create request', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'admin-2',
      username: 'admin-2',
      status: 'active',
      role: 'admin',
      isProtected: false,
    })

    await createUser({
      username: 'admin-2',
      password: 'new-account-password',
      role: 'admin',
      status: 'active',
      adminChallenge: 'operator-password',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin-2',
        password: 'new-account-password',
        role: 'admin',
        status: 'active',
        adminChallenge: 'operator-password',
        metadata: {
          intent: 'USER_CREATE',
          actorId: undefined,
        },
      }),
    })
  })

  it('sends the final admin challenge with an admin role promotion', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'user-1',
      username: 'buyer',
      status: 'active',
      role: 'admin',
    })

    await replaceUser('user-1', {
      username: 'buyer',
      phoneNumber: '',
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      role: 'admin',
      adminChallenge: 'operator-password',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/users/user-1', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'buyer',
        phoneNumber: '',
        firstName: 'Test',
        lastName: 'User',
        status: 'active',
        role: 'admin',
        adminChallenge: 'operator-password',
      }),
    })
  })

  it('keeps direct, inherited, and effective permissions separate', async () => {
    apiFetchMock.mockResolvedValue({
      userId: 'user-1',
      username: 'buyer',
      status: 'active',
      role: 'buyer',
      permissions: [
        {
          permissionId: 'page_purchase_orders',
          source: 'manual',
          updatedAt: '2026-07-18T00:00:00.000Z',
        },
      ],
      inheritedPermissions: ['menu_purchase'],
      effectivePermissions: ['menu_purchase', 'page_purchase_orders'],
      total: 1,
    })

    const result = await fetchUserPermissions('user-1')

    expect(result.permissions).toEqual([
      expect.objectContaining({
        permissionId: 'page_purchase_orders',
        source: 'manual',
        updatedAt: new Date('2026-07-18T00:00:00.000Z'),
      }),
    ])
    expect(result.inheritedPermissions).toEqual(['menu_purchase'])
    expect(result.effectivePermissions).toEqual([
      'menu_purchase',
      'page_purchase_orders',
    ])
  })

  it('lets the backend assign permission source metadata', async () => {
    apiFetchMock.mockResolvedValue({
      userId: 'user-1',
      permissions: ['page_purchase_orders'],
      changeSummary: { added: 1, removed: 0, unchanged: 0 },
    })

    await replaceUserPermissions('user-1', {
      permissions: ['page_purchase_orders'],
      reason: 'job responsibility changed',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/users/user-1/permissions', {
      method: 'PUT',
      body: JSON.stringify({
        permissions: ['page_purchase_orders'],
        reason: 'job responsibility changed',
      }),
    })
  })

  it('submits bulk deletion as one transactional request', async () => {
    apiFetchMock.mockResolvedValue({ deleted: 2 })

    await expect(bulkDeleteUsers(['user-1', 'user-2'])).resolves.toEqual({
      deleted: 2,
    })
    expect(apiFetchMock).toHaveBeenCalledWith('/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ userIds: ['user-1', 'user-2'] }),
    })
  })
})

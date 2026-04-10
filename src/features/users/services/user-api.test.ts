import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestUser } from '../test-factories'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import {
  addUserRoleBinding,
  createUser,
  fetchUserOptions,
  fetchUserRoleBindings,
  fetchUsers,
  patchUser,
  removeUserRoleBinding,
  replaceUser,
  setUserPrimaryRole,
} from './user-api'

describe('user-api contract regression', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('fetchUsers builds paginated query contract', async () => {
    const expected = {
      items: [
        createTestUser({
          id: 'u-1',
          employeeId: 'EMP-1',
          firstName: 'Alice',
          lastName: 'Fin',
          username: 'alice',
          phoneNumber: '123',
          role: 'finance_manager',
        }),
      ],
      total: 1,
      page: 2,
      pageSize: 20,
    }
    apiFetchMock.mockResolvedValue(expected)

    const result = await fetchUsers({
      page: 2,
      pageSize: 20,
      username: 'alice',
      status: ['active'],
      role: ['finance_manager'],
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/users?page=2&pageSize=20&username=alice&status=active&role=finance_manager')
    expect(result).toEqual(expected)
    expect(Array.isArray(result)).toBe(false)
    expect(result.items).toHaveLength(1)
  })

  it('fetchUserOptions builds lightweight options query', async () => {
    const expected = [
      {
        id: 'u-2',
        employeeId: 'EMP-2',
        username: 'bob',
        status: 'active',
        role: 'ops_manager',
      },
    ]
    apiFetchMock.mockResolvedValue(expected)

    const result = await fetchUserOptions({ role: ['ops_manager'], status: ['active'] })

    expect(apiFetchMock).toHaveBeenCalledWith('/users?options=true&role=ops_manager&status=active')
    expect(result).toEqual(expected)
    expect(Array.isArray(result)).toBe(true)
  })

  it('createUser sends backend-aligned create payload', async () => {
    apiFetchMock.mockResolvedValue({ id: 'u-3' })

    await createUser({
      username: 'new-user',
      password: 'plain-pass',
      email: 'new@example.com',
      role: 'finance_manager',
      status: 'active',
      employeeId: 'EMP-3',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: 'new-user',
        password: 'plain-pass',
        email: 'new@example.com',
        role: 'finance_manager',
        status: 'active',
        employeeId: 'EMP-3',
      }),
    })
  })

  it('patchUser sends partial update payload to PATCH contract', async () => {
    apiFetchMock.mockResolvedValue({ id: 'u-4' })

    await patchUser('u-4', {
      email: { o: undefined, n: 'patched@example.com' },
      status: { o: undefined, n: 'inactive' },
    }, 3)

    expect(apiFetchMock).toHaveBeenCalledWith('/users/u-4', {
      method: 'PATCH',
      body: JSON.stringify({
        op: 'PATCH',
        delta: {
          email: { o: undefined, n: 'patched@example.com' },
          status: { o: undefined, n: 'inactive' },
        },
        metadata: {
          id: 'u-4',
          version: 3,
        },
      }),
    })
  })

  it('replaceUser sends full replace payload to PUT contract', async () => {
    apiFetchMock.mockResolvedValue({ id: 'u-5' })

    await replaceUser('u-5', {
      username: 'replace-user',
      phoneNumber: '123456',
      firstName: 'Replace',
      lastName: 'User',
      status: 'active',
      role: 'ops_manager',
      employeeId: 'EMP-5',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/users/u-5', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'replace-user',
        phoneNumber: '123456',
        firstName: 'Replace',
        lastName: 'User',
        status: 'active',
        role: 'ops_manager',
        employeeId: 'EMP-5',
      }),
    })
  })

  it('fetchUserRoleBindings requests user role binding matrix', async () => {
    apiFetchMock.mockResolvedValue({
      userId: 'u-6',
      username: 'alice',
      primaryRoleId: 'ops_manager',
      effectiveRoles: ['ops_manager', 'finance_manager'],
      roleBindings: [
        { roleId: 'ops_manager', isPrimary: true, status: 'active' },
        { roleId: 'finance_manager', isPrimary: false, status: 'inactive' },
      ],
    })

    const result = await fetchUserRoleBindings('u-6')

    expect(apiFetchMock).toHaveBeenCalledWith('/users/u-6/roles')
    expect(result.userId).toBe('u-6')
    expect(result.primaryRoleId).toBe('ops_manager')
    expect(result.roleBindings).toHaveLength(2)
  })

  it('setUserPrimaryRole sends PATCH contract', async () => {
    apiFetchMock.mockResolvedValue({ id: 'u-7', role: 'finance_manager', status: 'active', username: 'bob' })

    await setUserPrimaryRole('u-7', 'finance_manager')

    expect(apiFetchMock).toHaveBeenCalledWith('/users/u-7/primary-role', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'finance_manager' }),
    })
  })

  it('addUserRoleBinding sends POST contract', async () => {
    apiFetchMock.mockResolvedValue({
      userId: 'u-8',
      username: 'carol',
      primaryRoleId: 'ops_manager',
      effectiveRoles: ['ops_manager', 'finance_manager'],
      roleBindings: [],
    })

    await addUserRoleBinding('u-8', { role: 'finance_manager', source: 'manual' })

    expect(apiFetchMock).toHaveBeenCalledWith('/users/u-8/roles', {
      method: 'POST',
      body: JSON.stringify({ role: 'finance_manager', source: 'manual' }),
    })
  })

  it('removeUserRoleBinding sends DELETE contract', async () => {
    apiFetchMock.mockResolvedValue({
      userId: 'u-9',
      username: 'dylan',
      primaryRoleId: 'ops_manager',
      effectiveRoles: ['ops_manager'],
      roleBindings: [],
    })

    await removeUserRoleBinding('u-9', 'finance_manager')

    expect(apiFetchMock).toHaveBeenCalledWith('/users/u-9/roles/finance_manager', {
      method: 'DELETE',
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toUserApiDTO } from '../adapters/user-api-adapter'
import { createTestUser } from '../test-factories'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import {
  bindUserEmployee,
  createUser,
  executeUserTransaction,
  fetchUserAccessSnapshot,
  fetchUserOptions,
  fetchUserPermissions,
  fetchUsers,
  patchUser,
  replaceUserPermissions,
  replaceUser,
  USER_TRANSACTION_INTENT_BIND_EMPLOYEE,
  USER_TRANSACTION_INTENT_CREATE,
  USER_TRANSACTION_INTENT_UNBIND_EMPLOYEE,
  unbindUserEmployee,
} from './user-api'

const createTestUserApiDTO = (overrides: Record<string, unknown> = {}) => ({
  ...toUserApiDTO(createTestUser()),
  ...overrides,
})

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
        }),
      ],
      total: 1,
      page: 2,
      pageSize: 20,
    }
    apiFetchMock.mockResolvedValue({
      items: [
        createTestUserApiDTO({
          id: 'u-1',
          employeeId: 'EMP-1',
          firstName: 'Alice',
          lastName: 'Fin',
          username: 'alice',
          phoneNumber: '123',
        }),
      ],
      total: 1,
      page: 2,
      pageSize: 20,
    })

    const result = await fetchUsers({
      page: 2,
      pageSize: 20,
      username: 'alice',
      status: ['active'],
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/users?page=2&pageSize=20&username=alice&status=active')
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
      },
    ]
    apiFetchMock.mockResolvedValue(expected)

    const result = await fetchUserOptions({ status: ['active'] })

    expect(apiFetchMock).toHaveBeenCalledWith('/users?options=true&status=active')
    expect(result).toEqual(expected)
    expect(Array.isArray(result)).toBe(true)
  })

  it('createUser sends backend-aligned create payload', async () => {
    apiFetchMock.mockResolvedValue(
      createTestUserApiDTO({
        id: 'u-3',
        username: 'new-user',
        employeeId: 'EMP-3',
      })
    )

    await createUser({
      username: 'new-user',
      password: 'plain-pass',
      email: 'new@example.com',
      status: 'active',
      employeeId: 'EMP-3',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: 'new-user',
        password: 'plain-pass',
        email: 'new@example.com',
        status: 'active',
        employeeId: 'EMP-3',
        metadata: {
          intent: USER_TRANSACTION_INTENT_CREATE,
          actorId: undefined,
        },
      }),
    })
  })

  it('executeUserTransaction sends intent metadata with optional actor', async () => {
    apiFetchMock.mockResolvedValue(
      createTestUserApiDTO({
        id: 'u-8',
        status: 'active',
        username: 'actor-user',
      })
    )

    await executeUserTransaction('/users/custom-command', {
      intent: USER_TRANSACTION_INTENT_BIND_EMPLOYEE,
      actorId: 'operator-1',
      payload: { employeeId: 'EMP-8' },
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/users/custom-command', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: 'EMP-8',
        metadata: {
          intent: USER_TRANSACTION_INTENT_BIND_EMPLOYEE,
          actorId: 'operator-1',
        },
      }),
    })
  })

  it('patchUser sends partial update payload to PATCH contract', async () => {
    apiFetchMock.mockResolvedValue(
      createTestUserApiDTO({
        id: 'u-4',
        email: 'patched@example.com',
        status: 'inactive',
      })
    )

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
    apiFetchMock.mockResolvedValue(
      createTestUserApiDTO({
        id: 'u-5',
        username: 'replace-user',
        phoneNumber: '123456',
        firstName: 'Replace',
        lastName: 'User',
        employeeId: 'EMP-5',
      })
    )

    await replaceUser('u-5', {
      username: 'replace-user',
      phoneNumber: '123456',
      firstName: 'Replace',
      lastName: 'User',
      status: 'active',
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
        employeeId: 'EMP-5',
      }),
    })
  })

  it('bindUserEmployee sends command contract', async () => {
    apiFetchMock.mockResolvedValue(
      createTestUserApiDTO({
        id: 'u-7',
        employeeId: 'EMP-7',
        status: 'active',
        username: 'bob',
      })
    )

    await bindUserEmployee('u-7', 'EMP-7')

    expect(apiFetchMock).toHaveBeenCalledWith('/users/u-7/bind-employee', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: 'EMP-7',
        metadata: {
          intent: USER_TRANSACTION_INTENT_BIND_EMPLOYEE,
          actorId: undefined,
        },
      }),
    })
  })

  it('unbindUserEmployee sends command contract', async () => {
    apiFetchMock.mockResolvedValue(
      createTestUserApiDTO({
        id: 'u-7',
        employeeId: undefined,
        status: 'active',
        username: 'bob',
      })
    )

    await unbindUserEmployee('u-7')

    expect(apiFetchMock).toHaveBeenCalledWith('/users/u-7/unbind-employee', {
      method: 'POST',
      body: JSON.stringify({
        metadata: {
          intent: USER_TRANSACTION_INTENT_UNBIND_EMPLOYEE,
          actorId: undefined,
        },
      }),
    })
  })

  it('fetchUsers fails fast when nested item DTO shape drifts', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'u-bad',
          status: 'active',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })

    await expect(fetchUsers()).rejects.toThrow(
      '[INVALID_RESPONSE] UserApi.fetchUsers failed DTO schema parse.'
    )
  })

  it('fetchUserOptions fails fast when option DTO shape drifts', async () => {
    apiFetchMock.mockResolvedValue([
      {
        id: 'u-bad',
      },
    ])

    await expect(fetchUserOptions()).rejects.toThrow(
      '[INVALID_RESPONSE] UserApi.fetchUserOptions failed DTO schema parse.'
    )
  })

  it('executeUserTransaction fails fast when returned user DTO shape drifts', async () => {
    apiFetchMock.mockResolvedValue({
      id: 123,
      username: 'bad-user',
      status: 'active',
    })

    await expect(
      executeUserTransaction('/users/custom-command', {
        intent: USER_TRANSACTION_INTENT_BIND_EMPLOYEE,
        payload: { employeeId: 'EMP-8' },
      })
    ).rejects.toThrow(
      '[INVALID_RESPONSE] UserApi.executeUserTransaction failed DTO schema parse.'
    )
  })

  it('fetchUserPermissions fails fast when permissions is missing', async () => {
    apiFetchMock.mockResolvedValue({
      userId: 'u-9',
      username: 'alice',
      status: 'active',
      total: 0,
    })

    await expect(fetchUserPermissions('u-9')).rejects.toThrow(
      '[INVALID_RESPONSE] UserApi.fetchUserPermissions failed DTO schema parse.'
    )
  })

  it('replaceUserPermissions fails fast when permissions is not an array', async () => {
    apiFetchMock.mockResolvedValue({
      userId: 'u-10',
      permissions: null,
      changeSummary: {
        added: 0,
        removed: 0,
        unchanged: 0,
      },
    })

    await expect(
      replaceUserPermissions('u-10', {
        permissions: ['users.view'],
      })
    ).rejects.toThrow(
      '[INVALID_RESPONSE] UserApi.replaceUserPermissions failed DTO schema parse.'
    )
  })

  it('fetchUserAccessSnapshot fails fast when permissions is not an array', async () => {
    apiFetchMock.mockResolvedValue({
      userId: 'u-11',
      username: 'alice',
      status: 'active',
      permissions: 'users.view',
    })

    await expect(fetchUserAccessSnapshot('u-11')).rejects.toThrow(
      '[INVALID_RESPONSE] UserApi.fetchUserAccessSnapshot failed DTO schema parse.'
    )
  })

  it('fetchUserAccessSnapshot allows missing diagnostics when other fields are valid', async () => {
    apiFetchMock.mockResolvedValue({
      userId: 'u-12',
      username: 'alice',
      status: 'active',
      permissions: ['users.view'],
    })

    await expect(fetchUserAccessSnapshot('u-12')).resolves.toEqual({
      userId: 'u-12',
      username: 'alice',
      employeeId: undefined,
      status: 'active',
      permissions: ['users.view'],
      diagnostics: undefined,
    })
  })
})

import { ZodError } from 'zod'
import { apiFetch } from '@/lib/api-client'
import { createApiClientError } from '@/lib/api-error'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  toUserContract,
  toUserAccessSnapshotContract,
  toUserListPageContract,
  toUserOptionContracts,
  toUserPermissionsReplaceResultContract,
  toUserPermissionsResponseContract,
} from '../adapters/user-api-adapter'
import {
  deserializeUserAccessSnapshotApiDTO,
  deserializeUserApiDTO,
  deserializeUserListPageApiDTO,
  deserializeUserOptionListApiDTO,
  deserializeUserPermissionsApiDTO,
  deserializeUserPermissionsReplaceResultApiDTO,
} from '../contracts/user-api-dto'

export const USER_TRANSACTION_INTENT_CREATE = 'USER_CREATE'
export const USER_TRANSACTION_INTENT_BIND_EMPLOYEE = 'USER_BIND_EMPLOYEE'
export const USER_TRANSACTION_INTENT_UNBIND_EMPLOYEE = 'USER_UNBIND_EMPLOYEE'

export interface CreateUserPayload {
  username: string
  password: string
  email?: string
  phoneNumber?: string
  firstName?: string
  lastName?: string
  status?: string
  role?: string
  employeeId?: string
  adminChallenge?: string
}

export interface UserUpdatePayload {
  username?: string
  password?: string
  email?: string
  phoneNumber?: string
  firstName?: string
  lastName?: string
  status?: string
  role?: string
  employeeId?: string
  adminChallenge?: string
}

export interface UserReplacePayload {
  username: string
  password?: string
  phoneNumber: string
  firstName: string
  lastName: string
  status: string
  role?: string
  employeeId?: string
  adminChallenge?: string
}

export interface ReplaceUserPermissionsPayload {
  permissions: string[]
  reason?: string
}

export interface UserTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  payload: TPayload
}

type UsersQueryValue = string | number | boolean | null | undefined | string[]
type UsersQueryParams = Record<string, UsersQueryValue>

const buildUserTransactionBody = <TPayload extends object>(
  request: UserTransactionRequest<TPayload>
) => ({
  ...request.payload,
  metadata: {
    intent: request.intent,
    actorId: request.actorId,
  },
})

const deserializeUsersApiDTO = <T>(
  input: unknown,
  context: string,
  deserializer: (value: unknown) => T
): T => {
  try {
    return deserializer(input)
  } catch (error) {
    if (error instanceof ZodError) {
      throw createApiClientError({
        kind: 'invalid_response',
        message: `[INVALID_RESPONSE] ${context} failed DTO schema parse.`,
        context,
        cause: error,
      })
    }

    throw error
  }
}

export const fetchUsers = async (params: UsersQueryParams = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          query.append(key, String(item))
        })
        return
      }

      query.append(key, String(value))
    }
  })

  const res = await apiFetch<unknown>(`/users?${query.toString()}`)
  return toUserListPageContract(
    deserializeUsersApiDTO(
      ensureObjectResponse(res, 'UserApi.fetchUsers'),
      'UserApi.fetchUsers',
      deserializeUserListPageApiDTO
    )
  )
}

export const fetchUserOptions = async (params: UsersQueryParams = {}) => {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          query.append(key, String(item))
        })
        return
      }

      query.append(key, String(value))
    }
  })

  const res = await apiFetch<unknown>(`/users/options?${query.toString()}`)
  return toUserOptionContracts(
    deserializeUsersApiDTO(
      res,
      'UserApi.fetchUserOptions',
      deserializeUserOptionListApiDTO
    )
  )
}

export const executeUserTransaction = async <TPayload extends object>(
  endpoint: string,
  request: UserTransactionRequest<TPayload>,
  context = 'UserApi.executeUserTransaction'
) => {
  const res = await apiFetch<unknown>(endpoint, {
    method: 'POST',
    body: JSON.stringify(buildUserTransactionBody(request)),
  })
  return toUserContract(
    deserializeUsersApiDTO(
      ensureObjectResponse(res, context),
      context,
      deserializeUserApiDTO
    )
  )
}

/**
 * 创建用户
 */
export const createUser = async (userData: CreateUserPayload) => {
  return executeUserTransaction<CreateUserPayload>(
    '/users',
    {
      intent: USER_TRANSACTION_INTENT_CREATE,
      payload: userData,
    },
    'UserApi.createUser'
  )
}

/**
 * 局部更新用户 (SDRTS 结构化差量更新)
 */
export const patchUser = async (
  id: string,
  delta: DeltaSet,
  version: number
) => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: {
      id,
      version,
    },
  }

  const res = await apiFetch<unknown>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return toUserContract(
    deserializeUsersApiDTO(
      ensureObjectResponse(res, 'UserApi.patchUser'),
      'UserApi.patchUser',
      deserializeUserApiDTO
    )
  )
}

export const replaceUser = async (id: string, userData: UserReplacePayload) => {
  const res = await apiFetch<unknown>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  })
  return toUserContract(
    deserializeUsersApiDTO(
      ensureObjectResponse(res, 'UserApi.replaceUser'),
      'UserApi.replaceUser',
      deserializeUserApiDTO
    )
  )
}

/**
 * 删除用户
 */
export const deleteUser = async (id: string) => {
  return apiFetch(`/users/${id}`, {
    method: 'DELETE',
  })
}

export const bulkDeleteUsers = async (userIds: string[]) => {
  return apiFetch<{ deleted: number }>('/users/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ userIds }),
  })
}

/**
 * 根据员工 ID 批量删除用户
 */

/**
 * 校验管理员特权挑战 (后端裁决)
 * 用于替代前端硬编码的“万能通行码”。前端仅发送 passcode，
 * 由后端校验当前会话是否有权执行敏感提权操作。
 */
export const verifyAdminChallenge = async (passcode: string) => {
  return apiFetch('/users/admin/verify', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  })
}

export const fetchUserAccessSnapshot = async (id: string) => {
  const context = 'UserApi.fetchUserAccessSnapshot'
  const res = await apiFetch<unknown>(`/users/${id}/access`)
  const payload = deserializeUsersApiDTO(
    ensureObjectResponse(res, context),
    context,
    deserializeUserAccessSnapshotApiDTO
  )

  return toUserAccessSnapshotContract(payload)
}

export const fetchUserPermissions = async (id: string) => {
  const context = 'UserApi.fetchUserPermissions'
  const res = await apiFetch<unknown>(`/users/${id}/permissions`)
  const payload = deserializeUsersApiDTO(
    ensureObjectResponse(res, context),
    context,
    deserializeUserPermissionsApiDTO
  )

  return toUserPermissionsResponseContract(payload)
}

export const replaceUserPermissions = async (
  id: string,
  payload: ReplaceUserPermissionsPayload
) => {
  const context = 'UserApi.replaceUserPermissions'
  const res = await apiFetch<unknown>(`/users/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  const responsePayload = deserializeUsersApiDTO(
    ensureObjectResponse(res, context),
    context,
    deserializeUserPermissionsReplaceResultApiDTO
  )

  return toUserPermissionsReplaceResultContract(responsePayload)
}

export const bindUserEmployee = async (id: string, employeeId: string) => {
  return executeUserTransaction<{ employeeId: string }>(
    `/users/${id}/bind-employee`,
    {
      intent: USER_TRANSACTION_INTENT_BIND_EMPLOYEE,
      payload: { employeeId },
    },
    'UserApi.bindUserEmployee'
  )
}

export const unbindUserEmployee = async (id: string) => {
  return executeUserTransaction<Record<string, never>>(
    `/users/${id}/unbind-employee`,
    {
      intent: USER_TRANSACTION_INTENT_UNBIND_EMPLOYEE,
      payload: {},
    },
    'UserApi.unbindUserEmployee'
  )
}

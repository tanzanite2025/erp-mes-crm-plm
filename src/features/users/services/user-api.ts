import { apiFetch } from '@/lib/api-client'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  toUserContract,
  toUserAccessSnapshotContract,
  toUserListPageContract,
  toUserOptionContracts,
  toUserPermissionsReplaceResultContract,
  toUserPermissionsResponseContract,
} from '../adapters/user-api-adapter'
import {
  type UserAccessSnapshotApiDTO,
  type UserApiDTO,
  type UserListPageApiDTO,
  type UserOptionApiDTO,
  type UserPermissionsApiDTO,
  type UserPermissionsReplaceResultApiDTO,
} from '../contracts/user-api-dto'

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
}

export interface ReplaceUserPermissionsPayload {
  permissions: string[]
  source?: string
  reason?: string
}

type UsersQueryValue = string | number | boolean | null | undefined | string[]
type UsersQueryParams = Record<string, UsersQueryValue>

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

  const res = await apiFetch<UserListPageApiDTO>(`/users?${query.toString()}`)
  return toUserListPageContract(
    ensureObjectResponse<UserListPageApiDTO & Record<string, unknown>>(res, 'UserApi.fetchUsers') as UserListPageApiDTO
  )
}

export const fetchUserOptions = async (params: UsersQueryParams = {}) => {
  const query = new URLSearchParams()
  query.append('options', 'true')

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

  const res = await apiFetch<UserOptionApiDTO[]>(`/users?${query.toString()}`)
  return toUserOptionContracts(ensureArrayResponse<UserOptionApiDTO>(res, 'UserApi.fetchUserOptions'))
}

/**
 * 创建用户
 */
export const createUser = async (userData: CreateUserPayload) => {
  const res = await apiFetch<UserApiDTO>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
  return toUserContract(
    ensureObjectResponse<UserApiDTO & Record<string, unknown>>(res, 'UserApi.createUser') as UserApiDTO
  )
}

/**
 * 局部更新用户 (SDRTS 结构化差量更新)
 */
export const patchUser = async (id: string, delta: DeltaSet, version: number) => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: {
      id,
      version,
    },
  }

  const res = await apiFetch<UserApiDTO>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return toUserContract(
    ensureObjectResponse<UserApiDTO & Record<string, unknown>>(res, 'UserApi.patchUser') as UserApiDTO
  )
}

export const replaceUser = async (id: string, userData: UserReplacePayload) => {
  const res = await apiFetch<UserApiDTO>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  })
  return toUserContract(
    ensureObjectResponse<UserApiDTO & Record<string, unknown>>(res, 'UserApi.replaceUser') as UserApiDTO
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

/**
 * 根据员工 ID 批量删除用户
 */
export const deleteUsersByEmployeeIds = async (employeeIds: string[]) => {
  return apiFetch('/users/bulk-delete-by-employees', {
    method: 'POST',
    body: JSON.stringify({ employeeIds }),
  })
}

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
  const res = await apiFetch<UserAccessSnapshotApiDTO>(`/users/${id}/access`)
  return toUserAccessSnapshotContract(
    ensureObjectResponse<UserAccessSnapshotApiDTO & Record<string, unknown>>(
      res,
      'UserApi.fetchUserAccessSnapshot',
    ) as UserAccessSnapshotApiDTO,
  )
}

export const fetchUserPermissions = async (id: string) => {
  const res = await apiFetch<UserPermissionsApiDTO>(`/users/${id}/permissions`)
  return toUserPermissionsResponseContract(
    ensureObjectResponse<UserPermissionsApiDTO & Record<string, unknown>>(
      res,
      'UserApi.fetchUserPermissions',
    ) as UserPermissionsApiDTO,
  )
}

export const replaceUserPermissions = async (id: string, payload: ReplaceUserPermissionsPayload) => {
  const res = await apiFetch<UserPermissionsReplaceResultApiDTO>(`/users/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return toUserPermissionsReplaceResultContract(
    ensureObjectResponse<UserPermissionsReplaceResultApiDTO & Record<string, unknown>>(
      res,
      'UserApi.replaceUserPermissions',
    ) as UserPermissionsReplaceResultApiDTO,
  )
}

export const bindUserEmployee = async (id: string, employeeId: string) => {
  const res = await apiFetch<UserApiDTO>(`/users/${id}/bind-employee`, {
    method: 'POST',
    body: JSON.stringify({ employeeId }),
  })
  return toUserContract(
    ensureObjectResponse<UserApiDTO & Record<string, unknown>>(res, 'UserApi.bindUserEmployee') as UserApiDTO,
  )
}

export const unbindUserEmployee = async (id: string) => {
  const res = await apiFetch<UserApiDTO>(`/users/${id}/unbind-employee`, {
    method: 'POST',
  })
  return toUserContract(
    ensureObjectResponse<UserApiDTO & Record<string, unknown>>(res, 'UserApi.unbindUserEmployee') as UserApiDTO,
  )
}

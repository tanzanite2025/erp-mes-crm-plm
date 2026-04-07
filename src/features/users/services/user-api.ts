import type { User, UserListPage, UserOption } from '../data/schema'
import { apiFetch } from '@/lib/api-client'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'

export interface CreateUserPayload {
  username: string
  password: string
  email?: string
  phoneNumber?: string
  firstName?: string
  lastName?: string
  role: string
  status?: string
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
  role: string
  employeeId?: string
}

type UsersQueryValue = string | number | boolean | null | undefined | string[]
type UsersQueryParams = Record<string, UsersQueryValue>

/**
 * 获取用户列表
 * 遵循“后端权威”原则：角色信息 (resolvedRole/roleInfo) 由 API 直接提供，前端不再进行自判定。
 */
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

  const res = await apiFetch<UserListPage>(`/users?${query.toString()}`)
  return ensureObjectResponse<UserListPage & Record<string, unknown>>(res, 'UserApi.fetchUsers') as UserListPage
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

  const res = await apiFetch<UserOption[]>(`/users?${query.toString()}`)
  return ensureArrayResponse<UserOption>(res, 'UserApi.fetchUserOptions')
}

/**
 * 创建用户
 */
export const createUser = async (userData: CreateUserPayload) => {
  const res = await apiFetch<User>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
  return ensureObjectResponse<User & Record<string, unknown>>(res, 'UserApi.createUser') as User
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

  const res = await apiFetch<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return ensureObjectResponse<User & Record<string, unknown>>(res, 'UserApi.patchUser') as User
}

export const replaceUser = async (id: string, userData: UserReplacePayload) => {
  const res = await apiFetch<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  })
  return ensureObjectResponse<User & Record<string, unknown>>(res, 'UserApi.replaceUser') as User
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

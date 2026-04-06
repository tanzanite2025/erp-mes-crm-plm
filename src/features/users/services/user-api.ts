import type { User, UserListPage, UserOption } from '../data/schema'
import { apiFetch } from '@/lib/api-client'

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

  return apiFetch<UserListPage>(`/users?${query.toString()}`)
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

  return apiFetch<UserOption[]>(`/users?${query.toString()}`)
}

/**
 * 创建用户
 */
export const createUser = async (userData: CreateUserPayload) => {
  return apiFetch<User>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

/**
 * 更新用户
 */
export const patchUser = async (id: string, userData: UserUpdatePayload) => {
  return apiFetch<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  })
}

export const replaceUser = async (id: string, userData: UserReplacePayload) => {
  return apiFetch<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  })
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

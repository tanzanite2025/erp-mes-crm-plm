import { type User } from '../data/schema'

/**
 * 判断用户是否为受系统保护的账户
 * 
 * 当前前端仅按受控用户名识别系统保护账户，
 * 以避免继续保留历史角色口径。
 */
export function isProtectedSystemAccount(user: User): boolean {
  if (!user) return false
  return user.username === 'admin'
}

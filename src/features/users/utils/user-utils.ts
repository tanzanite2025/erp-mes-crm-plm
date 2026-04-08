import { type User } from '../data/schema'

/**
 * 判断用户是否为超级管理员 (Super Admin)
 * 
 * 符合以下任一条件即判定为受系统保护的账户：
 * 1. 角色标识 (role) 为 'superadmin'
 * 2. 账号名 (username) 为 'admin' (后备安全检查)
 */
export function isSuperAdmin(user: User): boolean {
  if (!user) return false
  return user.role === 'superadmin' || user.username === 'admin'
}

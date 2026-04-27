import { type User } from '../data/schema'

/**
 * System protection is identified by controlled account name only.
 */
export function isProtectedSystemAccount(user: User): boolean {
  if (!user) return false
  return user.username === 'admin'
}

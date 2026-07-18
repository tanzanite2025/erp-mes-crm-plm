import { type User } from '../data/schema'

export function isProtectedSystemAccount(user: User): boolean {
  if (!user) return false
  return user.isProtected || user.username.trim().toLowerCase() === 'admin'
}

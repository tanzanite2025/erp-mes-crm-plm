import { type AppLocale } from '@/locales'
import { type User } from '../data/schema'

export function isProtectedSystemAccount(user: User): boolean {
  if (!user) return false
  return user.isProtected || user.username.trim().toLowerCase() === 'admin'
}

type UserNameLike = {
  firstName?: string | null
  lastName?: string | null
}

export function formatUserDisplayName(
  user: UserNameLike,
  locale: AppLocale
): string {
  const firstName = user.firstName?.trim() || ''
  const lastName = user.lastName?.trim() || ''

  if (!firstName && !lastName) return '-'

  if (locale === 'zh-CN') {
    return `${lastName}${firstName}`.trim() || '-'
  }

  return `${firstName} ${lastName}`.trim() || '-'
}

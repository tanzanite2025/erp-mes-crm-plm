import { describe, expect, it } from 'vitest'
import { createTestUser } from '../test-factories'
import { formatUserDisplayName } from './user-utils'

describe('formatUserDisplayName', () => {
  it('renders Chinese names in surname-given order without a space', () => {
    const user = createTestUser({
      firstName: '长江',
      lastName: '张',
    })

    expect(formatUserDisplayName(user, 'zh-CN')).toBe('张长江')
  })

  it('renders English names in given-family order with a space', () => {
    const user = createTestUser({
      firstName: 'John',
      lastName: 'Smith',
    })

    expect(formatUserDisplayName(user, 'en-US')).toBe('John Smith')
  })

  it('falls back to a dash when both name parts are empty', () => {
    const user = createTestUser({
      firstName: '   ',
      lastName: '',
    })

    expect(formatUserDisplayName(user, 'zh-CN')).toBe('-')
  })
})

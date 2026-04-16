import { describe, expect, it } from 'vitest'
import {
  getAuthSessionPermissionIds,
} from './auth-session'

describe('auth-session permission reader', () => {
  it('normalizes permission ids from the current auth session payload', () => {
    expect(getAuthSessionPermissionIds({ permissions: ['menu_org'] })).toEqual(['menu_org'])
  })
})

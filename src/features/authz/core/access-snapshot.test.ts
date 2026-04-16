import { describe, expect, it } from 'vitest'
import {
  getSnapshotPermissionIds,
} from './access-snapshot'

describe('access-snapshot permission reader', () => {
  it('normalizes permission ids independently from role compatibility fields', () => {
    expect(getSnapshotPermissionIds({ permissions: ['MENU_ORG', 'permission_user_view'] })).toEqual([
      'MENU_ORG',
      'permission_user_view',
    ])
  })
})

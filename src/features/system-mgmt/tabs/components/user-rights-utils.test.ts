import { describe, expect, it } from 'vitest'
import { buildAccountRoleOptions } from './user-rights-utils'

describe('user-rights-utils', () => {
  it('buildAccountRoleOptions extracts unique account roles and marks imported ones disabled', () => {
    const result = buildAccountRoleOptions(
      [
        { id: 'u-1', username: 'alice', role: 'Warehouse', status: 'active' },
        { id: 'u-2', username: 'bob', role: 'warehouse', status: 'active' },
        { id: 'u-3', username: 'carl', role: 'QA', status: 'active' },
        { id: 'u-4', username: 'dora', status: 'active' },
      ],
      ['qa']
    )

    expect(result).toEqual([
      {
        label: 'QA',
        value: 'QA',
        disabled: true,
      },
      {
        label: 'Warehouse',
        value: 'Warehouse',
        disabled: false,
      },
    ])
  })
})

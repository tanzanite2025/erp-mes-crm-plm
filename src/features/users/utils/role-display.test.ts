import { describe, expect, it } from 'vitest'
import { createTestRole } from '@/features/system-mgmt/test-factories'
import { buildRoleDisplayText, resolveRoleLabels } from './role-display'

describe('role-display', () => {
  it('builds friendly role text from dynamic roles and org nodes', () => {
    const text = buildRoleDisplayText(
      ['purchaser', 'org_dept-1'],
      [createTestRole({ id: 'purchaser', label: '采购专员', color: '' })],
      {
        orgNodes: [{ id: 'dept-1', name: '采购部', children: [] }],
      },
    )

    expect(text).toBe('采购专员 / 采购部')
  })

  it('deduplicates repeated role labels by default', () => {
    const text = buildRoleDisplayText(
      ['purchaser', 'purchaser'],
      [createTestRole({ id: 'purchaser', label: '采购专员', color: '' })],
    )

    expect(text).toBe('采购专员')
  })

  it('falls back to raw role id when no dictionary match exists', () => {
    expect(resolveRoleLabels(['unknown_role'], [])).toEqual(['unknown_role'])
  })

  it('returns undefined for empty role ids', () => {
    expect(buildRoleDisplayText([], [])).toBeUndefined()
    expect(buildRoleDisplayText(undefined, [])).toBeUndefined()
  })
})

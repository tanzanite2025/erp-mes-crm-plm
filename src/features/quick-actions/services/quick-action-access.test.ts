import { describe, expect, it } from 'vitest'
import type { SidebarCommandDefinitionDto } from '@/features/sidebar-command-assignment/services'
import { getSidebarQuickActions } from './quick-action-access'

function createBusinessCommand(
  overrides: Partial<SidebarCommandDefinitionDto> = {}
): SidebarCommandDefinitionDto {
  return {
    commandId: 'quality_scan',
    title: '质量扫描',
    description: '质量现场扫描入口',
    route: '/quality/scan',
    searchParams: { mode: 'scan' },
    icon: 'ClipboardCheck',
    category: 'quality',
    assignable: true,
    enabled: true,
    status: 'active',
    sortOrder: 10,
    ...overrides,
  }
}

describe('getSidebarQuickActions', () => {
  it('uses assigned business command definitions before fixed private tools', () => {
    const actions = getSidebarQuickActions(
      [createBusinessCommand()],
      ['personal_workbench_photo', 'personal_workbench_buffer']
    )

    expect(actions.map((action) => action.id)).toEqual([
      'quality_scan',
      'personal_workbench_photo',
      'personal_workbench_buffer',
    ])
    expect(actions[0]).toEqual(
      expect.objectContaining({
        title: '质量扫描',
        to: '/quality/scan',
        search: { mode: 'scan' },
        isPrivate: false,
      })
    )
    expect(actions[1]).toEqual(
      expect.objectContaining({
        id: 'personal_workbench_photo',
        isPrivate: true,
      })
    )
  })

  it('filters disabled business commands without removing private tools', () => {
    const actions = getSidebarQuickActions(
      [createBusinessCommand({ enabled: false, status: 'disabled' })],
      ['personal_workbench_video']
    )

    expect(actions.map((action) => action.id)).toEqual([
      'personal_workbench_video',
    ])
  })
})

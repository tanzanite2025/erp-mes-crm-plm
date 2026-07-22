import { describe, expect, it } from 'vitest'
import { checkIsActive } from './sidebar-nav-utils'
import type { NavLink } from './types'

describe('sidebar nav active matching', () => {
  it('keeps a module sidebar item active across sibling tab routes', () => {
    const cuttingEngineItem: NavLink = {
      id: 'cutting-engine',
      title: 'Cutting Engine',
      url: '/raw-materials-engine/config',
      activeMatch: '/raw-materials-engine',
    }

    expect(
      checkIsActive('/raw-materials-engine/config', cuttingEngineItem)
    ).toBe(true)
    expect(
      checkIsActive(
        '/raw-materials-engine/cutting-simulation',
        cuttingEngineItem
      )
    ).toBe(true)
  })

  it('keeps a sidebar domain active across sibling tab route paths', () => {
    const attendanceItem: NavLink = {
      id: 'attendance-management',
      title: 'Attendance Management',
      url: '/attendance-management/leave',
      activeMatch: '/attendance-management',
    }

    expect(checkIsActive('/attendance-management/leave', attendanceItem)).toBe(
      true
    )
    expect(
      checkIsActive('/attendance-management/hall-of-fame', attendanceItem)
    ).toBe(true)
  })

  it('keeps quick action command tabs under the same sidebar domain', () => {
    const commandConfigItem: NavLink = {
      id: 'sidebar-command-config',
      title: 'Quick Action Command Config',
      url: '/sidebar-command/library',
      activeMatch: '/sidebar-command',
    }

    expect(checkIsActive('/sidebar-command/library', commandConfigItem)).toBe(
      true
    )
    expect(
      checkIsActive('/sidebar-command/assignment', commandConfigItem)
    ).toBe(true)
  })
})

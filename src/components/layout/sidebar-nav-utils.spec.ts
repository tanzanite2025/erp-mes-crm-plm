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
})

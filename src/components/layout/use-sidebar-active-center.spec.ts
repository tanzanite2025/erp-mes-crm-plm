import { describe, expect, it } from 'vitest'
import { calculateSidebarCenterScrollTop } from './use-sidebar-active-center'

describe('calculateSidebarCenterScrollTop', () => {
  it('centers the complete active hierarchy in the viewport', () => {
    expect(
      calculateSidebarCenterScrollTop({
        viewportTop: 100,
        viewportHeight: 400,
        currentScrollTop: 50,
        scrollHeight: 1_000,
        activeTop: 300,
        activeBottom: 340,
      })
    ).toBe(70)
  })

  it('clamps the target at the start of the menu', () => {
    expect(
      calculateSidebarCenterScrollTop({
        viewportTop: 100,
        viewportHeight: 400,
        currentScrollTop: 0,
        scrollHeight: 1_000,
        activeTop: 110,
        activeBottom: 150,
      })
    ).toBe(0)
  })

  it('clamps the target at the end of the menu', () => {
    expect(
      calculateSidebarCenterScrollTop({
        viewportTop: 100,
        viewportHeight: 400,
        currentScrollTop: 590,
        scrollHeight: 1_000,
        activeTop: 470,
        activeBottom: 500,
      })
    ).toBe(600)
  })
})

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  calculateSidebarCenterScrollTop,
  centerActiveSidebarPath,
} from './use-sidebar-active-center'

describe('calculateSidebarCenterScrollTop', () => {
  it('centers the active focus in the viewport', () => {
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

  it('uses the live viewport height across screen sizes and zoom levels', () => {
    const metrics = {
      viewportTop: 100,
      currentScrollTop: 0,
      scrollHeight: 1_200,
      activeTop: 500,
      activeBottom: 540,
    }

    expect(
      calculateSidebarCenterScrollTop({ ...metrics, viewportHeight: 300 })
    ).toBe(270)
    expect(
      calculateSidebarCenterScrollTop({ ...metrics, viewportHeight: 600 })
    ).toBe(120)
  })
})

describe('centerActiveSidebarPath', () => {
  it('centers the deepest selected item instead of the ancestor hierarchy', () => {
    const viewport = document.createElement('div')
    const group = document.createElement('div')
    const selectedItem = document.createElement('div')

    group.dataset.sidebarActivePath = 'true'
    selectedItem.dataset.sidebarActivePath = 'true'
    selectedItem.dataset.sidebarActiveFocus = 'true'
    viewport.append(group, selectedItem)

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 1_000 },
      scrollTop: { configurable: true, value: 50, writable: true },
    })
    viewport.getBoundingClientRect = vi.fn(() => ({ top: 100 }) as DOMRect)
    group.getBoundingClientRect = vi.fn(
      () => ({ top: 200, bottom: 240 }) as DOMRect
    )
    selectedItem.getBoundingClientRect = vi.fn(
      () => ({ top: 360, bottom: 400 }) as DOMRect
    )
    viewport.scrollTo = vi.fn()

    expect(centerActiveSidebarPath(viewport, 'auto')).toBe(true)
    expect(viewport.scrollTo).toHaveBeenCalledWith({
      top: 130,
      behavior: 'auto',
    })
  })
})

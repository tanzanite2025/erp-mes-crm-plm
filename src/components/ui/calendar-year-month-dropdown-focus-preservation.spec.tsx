// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Calendar } from './calendar'

afterEach(cleanup)

describe('Calendar year and month dropdowns preserve their DOM and focus during updates', () => {
  it.each(['Choose the Year', 'Choose the Month'])(
    'keeps the active %s dropdown mounted across parent renders',
    (label) => {
      const props = {
        mode: 'single' as const,
        captionLayout: 'dropdown' as const,
        defaultMonth: new Date(2026, 9),
        startMonth: new Date(1900, 0),
        endMonth: new Date(2046, 11),
      }
      const { rerender } = render(<Calendar {...props} />)
      const dropdown = screen.getByRole('combobox', { name: label })
      dropdown.focus()
      expect(dropdown).toHaveFocus()
      rerender(<Calendar {...props} />)
      expect(screen.getByRole('combobox', { name: label })).toBe(dropdown)
      expect(dropdown).toHaveFocus()
    }
  )

  it('keeps both dropdowns mounted when changing the displayed year and month', () => {
    const onMonthChange = vi.fn()
    render(
      <Calendar
        mode='single'
        captionLayout='dropdown'
        defaultMonth={new Date(2026, 9)}
        startMonth={new Date(1900, 0)}
        endMonth={new Date(2046, 11)}
        onMonthChange={onMonthChange}
      />
    )
    const year = screen.getByRole('combobox', { name: 'Choose the Year' })
    const month = screen.getByRole('combobox', { name: 'Choose the Month' })
    fireEvent.change(year, { target: { value: '1998' } })
    expect(
      onMonthChange.mock.calls[
        onMonthChange.mock.calls.length - 1
      ]?.[0].getFullYear()
    ).toBe(1998)
    fireEvent.change(month, { target: { value: '0' } })
    expect(
      onMonthChange.mock.calls[
        onMonthChange.mock.calls.length - 1
      ]?.[0].getMonth()
    ).toBe(0)
    expect(screen.getByRole('combobox', { name: 'Choose the Year' })).toBe(year)
    expect(screen.getByRole('combobox', { name: 'Choose the Month' })).toBe(
      month
    )
  })
})

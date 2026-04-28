// @vitest-environment jsdom

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Row } from '@tanstack/react-table'
import type { User } from '../data/schema'

const { setOpenMock, setCurrentRowMock, tMock } = vi.hoisted(() => ({
  setOpenMock: vi.fn(),
  setCurrentRowMock: vi.fn(),
  tMock: vi.fn((key: string) => key),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: tMock,
  }),
}))

vi.mock('@/components/permission-passthrough', () => ({
  NonBlockingPermissionBoundary: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenuShortcut: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

vi.mock('./users-provider', () => ({
  useUsers: () => ({
    setOpen: setOpenMock,
    setCurrentRow: setCurrentRowMock,
  }),
}))

import { DataTableRowActions } from './data-table-row-actions'

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    username: 'admin',
    password: '',
    role: '',
    status: 'active',
    employeeId: '',
    createdAt: new Date('2026-04-28T00:00:00.000Z'),
    updatedAt: new Date('2026-04-28T00:00:00.000Z'),
    phoneNumber: '',
    firstName: '',
    lastName: '',
    version: 1,
    ...overrides,
  }
}

function createRow(user: User): Row<User> {
  return {
    original: user,
  } as Row<User>
}

describe('DataTableRowActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('allows protected admin accounts to open permissions dialog in permissions mode', async () => {
    const user = userEvent.setup()
    const rowUser = buildUser({ username: 'admin' })

    render(<DataTableRowActions row={createRow(rowUser)} mode='permissions' />)

    const button = screen.getByRole('button', { name: 'users.actions.managePermissions' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)

    await user.click(button)

    expect(setCurrentRowMock).toHaveBeenCalledWith(rowUser)
    expect(setOpenMock).toHaveBeenCalledWith('permissions')
  })

  it('keeps protected admin management actions disabled outside permissions mode', () => {
    const rowUser = buildUser({ username: 'admin' })

    render(<DataTableRowActions row={createRow(rowUser)} mode='management' />)

    const managePermissionsButton = screen.getByRole('button', {
      name: 'users.actions.managePermissions',
    }) as HTMLButtonElement
    const editButton = screen.getByRole('button', { name: 'common.actions.edit' }) as HTMLButtonElement
    const deleteButton = screen.getByRole('button', { name: 'common.actions.delete' }) as HTMLButtonElement

    expect(managePermissionsButton.disabled).toBe(true)
    expect(editButton.disabled).toBe(true)
    expect(deleteButton.disabled).toBe(true)
  })
})

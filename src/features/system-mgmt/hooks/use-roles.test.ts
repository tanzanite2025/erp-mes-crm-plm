import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useEffectMock, useStateMock } = vi.hoisted(() => ({
  useEffectMock: vi.fn(),
  useStateMock: vi.fn(),
}))

const { getRolesMock, upsertRoleMock, deleteRoleMock, toastErrorMock } = vi.hoisted(() => ({
  getRolesMock: vi.fn(),
  upsertRoleMock: vi.fn(),
  deleteRoleMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useEffect: useEffectMock,
    useState: useStateMock,
  }
})

vi.mock('../services/role-service', () => ({
  RoleService: {
    getRoles: getRolesMock,
    upsertRole: upsertRoleMock,
    deleteRole: deleteRoleMock,
  },
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}))

import { useRoles } from './use-roles'

describe('use-roles regression', () => {
  beforeEach(() => {
    useEffectMock.mockReset()
    useStateMock.mockReset()
    getRolesMock.mockReset()
    upsertRoleMock.mockReset()
    deleteRoleMock.mockReset()
    toastErrorMock.mockReset()

    useEffectMock.mockImplementation((effect: () => void | (() => void)) => {
      effect()
    })
  })

  it('keeps loaded backend role permissions contract unchanged on fetch', async () => {
    const setRoles = vi.fn()
    const setIsInitialLoading = vi.fn()
    const setError = vi.fn()

    useStateMock
      .mockImplementationOnce(() => [[], setRoles])
      .mockImplementationOnce(() => [true, setIsInitialLoading])
      .mockImplementationOnce(() => [null, setError])

    getRolesMock.mockResolvedValue([
      {
        id: 'ops_manager',
        label: 'Ops',
        color: '',
        permissions: ['page_dashboard_home'],
      },
    ])

    useRoles()
    await Promise.resolve()
    await Promise.resolve()

    expect(getRolesMock).toHaveBeenCalledTimes(1)
    expect(setRoles).toHaveBeenCalledWith([
      {
        id: 'ops_manager',
        label: 'Ops',
        color: '',
        permissions: ['page_dashboard_home'],
      },
    ])
    expect(setError).toHaveBeenCalledWith(null)
    expect(setIsInitialLoading).toHaveBeenLastCalledWith(false)
  })

  it('adds new account-linked role with empty backend contract permissions instead of frontend defaults', async () => {
    const setRoles = vi.fn()

    useStateMock
      .mockImplementationOnce(() => [[{ id: 'admin', label: 'Admin', color: '', permissions: ['menu_dashboard'] }], setRoles])
      .mockImplementationOnce(() => [false, vi.fn()])
      .mockImplementationOnce(() => [null, vi.fn()])

    upsertRoleMock.mockResolvedValue(undefined)

    const result = useRoles(false)
    await result.addRole('Warehouse', 'Warehouse')

    expect(setRoles).toHaveBeenCalledWith(expect.any(Function))
    const updaterCall = setRoles.mock.calls.find((call) => typeof call?.[0] === 'function')
    const updater = updaterCall?.[0]
    expect(
      updater([{ id: 'admin', label: 'Admin', color: '', permissions: ['menu_dashboard'] }]),
    ).toEqual([
      { id: 'admin', label: 'Admin', color: '', permissions: ['menu_dashboard'] },
      {
        id: 'Warehouse',
        label: 'Warehouse',
        color: 'bg-slate-500/10 text-slate-600 border-slate-200',
        permissions: [],
        version: 1,
      },
    ])
    expect(upsertRoleMock).toHaveBeenCalledWith({
      id: 'Warehouse',
      label: 'Warehouse',
      color: 'bg-slate-500/10 text-slate-600 border-slate-200',
      permissions: [],
      version: 1,
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useCallbackMock, useEffectMock, useMemoMock } = vi.hoisted(() => ({
  useCallbackMock: vi.fn(),
  useEffectMock: vi.fn(),
  useMemoMock: vi.fn(),
}))

vi.mock('react', () => ({
  useCallback: useCallbackMock,
  useEffect: useEffectMock,
  useMemo: useMemoMock,
}))

import { useUsersActionDialogSync } from './use-users-action-dialog-sync'

describe('use-users-action-dialog-sync regression', () => {
  beforeEach(() => {
    useCallbackMock.mockReset()
    useEffectMock.mockReset()
    useMemoMock.mockReset()
    useCallbackMock.mockImplementation((factory: (...args: never[]) => unknown) => factory)
    useMemoMock.mockImplementation((factory: () => unknown) => factory())
    useEffectMock.mockImplementation((effect: () => void | (() => void)) => {
      effect()
    })
  })

  it('auto binds org department role when selected employee department role exists', () => {
    const setValue = vi.fn()
    const clearErrors = vi.fn()
    const setError = vi.fn()

    const form = {
      watch: vi.fn().mockReturnValue('emp-1'),
      setValue,
      clearErrors,
      setError,
    }

    const employees = [
      {
        label: 'Alice',
        value: 'emp-1',
        raw: {
          id: 'emp-1',
          name: '张三',
          phone: '13800000000',
          status: 'active' as const,
          deptId: 'dept-1',
        },
      },
    ]

    const dynamicRoles = [
      { id: 'org_dept-1', label: '生产部', color: '', permissions: ['menu_org'] },
    ]

    const result = useUsersActionDialogSync({
      employees,
      currentRow: undefined,
      dynamicRoles,
      form: form as never,
      isEdit: false,
      t: (key: string) => key,
    })

    expect(result.selectedEmployeeDeptRoleId).toBe('org_dept-1')
    result.handleEmployeeSync('emp-1')
    expect(setValue).toHaveBeenCalledWith('role', 'org_dept-1')
    expect(clearErrors).toHaveBeenCalledWith('role')
    expect(setError).not.toHaveBeenCalled()
  })

  it('matches shared department role helper with normalized dynamic role ids', () => {
    const setValue = vi.fn()
    const clearErrors = vi.fn()
    const setError = vi.fn()

    const form = {
      watch: vi.fn().mockReturnValue('emp-3'),
      setValue,
      clearErrors,
      setError,
    }

    const employees = [
      {
        label: 'Carol',
        value: 'emp-3',
        raw: {
          id: 'emp-3',
          name: '王五',
          phone: '13700000000',
          status: 'active' as const,
          deptId: 'Dept-3',
        },
      },
    ]

    const result = useUsersActionDialogSync({
      employees,
      currentRow: undefined,
      dynamicRoles: [{ id: 'ORG_DEPT-3', label: '质检部', color: '', permissions: [] }],
      form: form as never,
      isEdit: false,
      t: (key: string) => key,
    })

    expect(result.selectedEmployeeDeptRoleId).toBe('ORG_DEPT-3')
    result.handleEmployeeSync('emp-3')
    expect(setValue).toHaveBeenCalledWith('role', 'ORG_DEPT-3')
    expect(clearErrors).toHaveBeenCalledWith('role')
    expect(setError).not.toHaveBeenCalled()
  })

  it('raises validation error when selected employee department org role is missing', () => {
    const setValue = vi.fn()
    const clearErrors = vi.fn()
    const setError = vi.fn()

    const form = {
      watch: vi.fn().mockReturnValue('emp-2'),
      setValue,
      clearErrors,
      setError,
    }

    const employees = [
      {
        label: 'Bob',
        value: 'emp-2',
        raw: {
          id: 'emp-2',
          name: '李四',
          phone: '13900000000',
          status: 'active' as const,
          deptId: 'dept-missing',
        },
      },
    ]

    const result = useUsersActionDialogSync({
      employees,
      currentRow: undefined,
      dynamicRoles: [],
      form: form as never,
      isEdit: false,
      t: (key: string) => key,
    })

    expect(result.selectedEmployeeDeptRoleId).toBe('')
    result.handleEmployeeSync('emp-2')
    expect(setValue).toHaveBeenCalledWith('role', '')
    expect(setError).toHaveBeenCalledWith('role', {
      type: 'manual',
      message: 'users.validation.employeeDeptRoleRequired',
    })
  })
})

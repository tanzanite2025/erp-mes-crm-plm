import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestEmployee } from '@/features/org-personnel/test-factories'
import { createTestRole } from '@/features/system-mgmt/test-factories'

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

function createEmployeeOption(overrides: Parameters<typeof createTestEmployee>[0] = {}) {
  const employee = createTestEmployee(overrides)
  return {
    label: employee.name,
    value: employee.id,
    raw: employee,
  }
}

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

  it('auto-fills role from department default when role is empty', () => {
    const setValue = vi.fn()
    const clearErrors = vi.fn()
    const setError = vi.fn()
    const getValues = vi.fn().mockReturnValue('')

    const form = {
      watch: vi.fn().mockReturnValue('emp-1'),
      getValues,
      setValue,
      clearErrors,
      setError,
    }

    const employees = [
      createEmployeeOption({ id: 'emp-1', name: 'Alice', deptId: 'dept-1' }),
    ]

    const dynamicRoles = [
      createTestRole({ id: 'org_dept-1', label: 'Dept 1', color: '', permissions: ['menu_org'] }),
    ]

    const result = useUsersActionDialogSync({
      employees,
      dynamicRoles,
      form: form as never,
      isEdit: false,
    })

    expect(result.selectedEmployeeDeptRoleId).toBe('org_dept-1')
    result.handleEmployeeSync('emp-1')
    expect(setValue).toHaveBeenCalledWith('role', 'org_dept-1')
    expect(clearErrors).toHaveBeenCalledWith('role')
    expect(setError).not.toHaveBeenCalled()
  })

  it('matches department role helper with normalized role ids', () => {
    const setValue = vi.fn()
    const clearErrors = vi.fn()
    const setError = vi.fn()
    const getValues = vi.fn().mockReturnValue('')

    const form = {
      watch: vi.fn().mockReturnValue('emp-3'),
      getValues,
      setValue,
      clearErrors,
      setError,
    }

    const employees = [
      createEmployeeOption({ id: 'emp-3', name: 'Bob', phone: '13700000000', deptId: 'Dept-3' }),
    ]

    const result = useUsersActionDialogSync({
      employees,
      dynamicRoles: [createTestRole({ id: 'ORG_DEPT-3', label: 'QA', color: '', permissions: [] })],
      form: form as never,
      isEdit: false,
    })

    expect(result.selectedEmployeeDeptRoleId).toBe('ORG_DEPT-3')
    result.handleEmployeeSync('emp-3')
    expect(setValue).toHaveBeenCalledWith('role', 'ORG_DEPT-3')
    expect(clearErrors).toHaveBeenCalledWith('role')
    expect(setError).not.toHaveBeenCalled()
  })

  it('does not raise validation error when no department default role exists', () => {
    const setValue = vi.fn()
    const clearErrors = vi.fn()
    const setError = vi.fn()
    const getValues = vi.fn().mockReturnValue('')

    const form = {
      watch: vi.fn().mockReturnValue('emp-2'),
      getValues,
      setValue,
      clearErrors,
      setError,
    }

    const employees = [
      createEmployeeOption({ id: 'emp-2', name: 'Chris', phone: '13900000000', deptId: 'dept-missing' }),
    ]

    const result = useUsersActionDialogSync({
      employees,
      dynamicRoles: [],
      form: form as never,
      isEdit: false,
    })

    expect(result.selectedEmployeeDeptRoleId).toBe('')
    result.handleEmployeeSync('emp-2')
    expect(setValue).not.toHaveBeenCalledWith('role', '')
    expect(setError).not.toHaveBeenCalled()
  })

  it('does not override manually selected role during employee sync', () => {
    const setValue = vi.fn()
    const clearErrors = vi.fn()
    const setError = vi.fn()
    const getValues = vi.fn().mockImplementation((key: string) => (key === 'role' ? 'ops_manager' : ''))

    const form = {
      watch: vi.fn().mockReturnValue('emp-4'),
      getValues,
      setValue,
      clearErrors,
      setError,
    }

    const employees = [
      createEmployeeOption({ id: 'emp-4', name: 'Doris', phone: '13600000000', deptId: 'dept-4' }),
    ]

    const result = useUsersActionDialogSync({
      employees,
      dynamicRoles: [createTestRole({ id: 'org_dept-4', label: 'Purchase', color: '', permissions: [] })],
      form: form as never,
      isEdit: false,
    })

    result.handleEmployeeSync('emp-4')
    expect(setValue).not.toHaveBeenCalledWith('role', 'org_dept-4')
    expect(clearErrors).not.toHaveBeenCalledWith('role')
    expect(setError).not.toHaveBeenCalled()
  })
})


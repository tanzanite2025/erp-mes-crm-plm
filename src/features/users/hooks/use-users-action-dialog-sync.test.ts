import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestEmployee } from '@/features/org-personnel/test-factories'

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

  it('auto-fills employee profile fields on create sync', () => {
    const setValue = vi.fn()

    const form = {
      watch: vi.fn().mockReturnValue('emp-1'),
      setValue,
    }

    const employees = [
      createEmployeeOption({ id: 'emp-1', name: '张三', phone: '13800000000', deptId: 'dept-1' }),
    ]

    const result = useUsersActionDialogSync({
      employees,
      form: form as never,
      isEdit: false,
    })

    expect(result.selectedEmployee?.id).toBe('emp-1')
    result.handleEmployeeSync('emp-1')

    expect(setValue).toHaveBeenCalledWith('lastName', '张')
    expect(setValue).toHaveBeenCalledWith('firstName', '三')
    expect(setValue).toHaveBeenCalledWith('phoneNumber', '13800000000')
    expect(setValue).toHaveBeenCalledWith('username', '13800000000')
  })

  it('falls back to employee id prefix when employee phone is empty', () => {
    const setValue = vi.fn()

    const form = {
      watch: vi.fn().mockReturnValue('employee-xyz-123'),
      setValue,
    }

    const employees = [
      createEmployeeOption({ id: 'employee-xyz-123', name: '李四', phone: '', deptId: 'Dept-3' }),
    ]

    const result = useUsersActionDialogSync({
      employees,
      form: form as never,
      isEdit: false,
    })

    expect(result.selectedEmployee?.id).toBe('employee-xyz-123')
    result.handleEmployeeSync('employee-xyz-123')

    expect(setValue).toHaveBeenCalledWith('lastName', '李')
    expect(setValue).toHaveBeenCalledWith('firstName', '四')
    expect(setValue).toHaveBeenCalledWith('phoneNumber', '')
    expect(setValue).toHaveBeenCalledWith('username', 'employee')
  })

  it('does nothing when employee is missing', () => {
    const setValue = vi.fn()

    const form = {
      watch: vi.fn().mockReturnValue('emp-missing'),
      setValue,
    }

    const employees = [createEmployeeOption({ id: 'emp-2', name: 'Chris', phone: '13900000000' })]

    const result = useUsersActionDialogSync({
      employees,
      form: form as never,
      isEdit: false,
    })

    expect(result.selectedEmployee).toBeUndefined()
    result.handleEmployeeSync('emp-missing')
    expect(setValue).not.toHaveBeenCalled()
  })

  it('does not sync employee profile fields during edit mode', () => {
    const setValue = vi.fn()

    const form = {
      watch: vi.fn().mockReturnValue('emp-4'),
      setValue,
    }

    const employees = [
      createEmployeeOption({ id: 'emp-4', name: '王五', phone: '13600000000', deptId: 'dept-4' }),
    ]

    const result = useUsersActionDialogSync({
      employees,
      form: form as never,
      isEdit: true,
    })

    result.handleEmployeeSync('emp-4')
    expect(setValue).not.toHaveBeenCalled()
  })
})

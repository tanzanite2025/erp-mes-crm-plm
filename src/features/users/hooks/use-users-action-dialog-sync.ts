import { useMemo, useCallback } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { type Role } from '@/features/system-mgmt/data/role-schema'
import { type EmployeeOption, type TranslateFn, type UserForm } from '../components/users-action-dialog.shared'
import { type User } from '../data/schema'
import { resolveDepartmentRoleId, resolveDepartmentRoleIdFromEmployee } from '../utils/department-role'

type UseUsersActionDialogSyncParams = {
  employees: EmployeeOption[]
  currentRow?: User
  dynamicRoles: Role[]
  form: UseFormReturn<UserForm>
  isEdit: boolean
  t: TranslateFn
}

export function useUsersActionDialogSync({
  employees,
  currentRow,
  dynamicRoles,
  form,
  isEdit,
  t,
}: UseUsersActionDialogSyncParams) {
  const selectedEmployeeId = form.watch('employeeId')

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.value === selectedEmployeeId)?.raw,
    [employees, selectedEmployeeId]
  )

  const selectedEmployeeDeptRoleId = useMemo(() => {
    return resolveDepartmentRoleIdFromEmployee(dynamicRoles, selectedEmployee)
  }, [dynamicRoles, selectedEmployee])

  const isEmployeeBoundRoleLocked =
    (!isEdit && Boolean(selectedEmployeeDeptRoleId)) || (isEdit && Boolean(currentRow?.employeeId))

  const handleEmployeeSync = useCallback((empId: string) => {
    if (!empId || isEdit) return

    const empOption = employees.find((employee) => employee.value === empId)
    const emp = empOption?.raw

    if (emp) {
      const name = emp.name || ''
      const lastName = name.charAt(0)
      const firstName = name.length > 1 ? name.substring(1) : ''

      form.setValue('lastName', lastName)
      form.setValue('firstName', firstName)
      form.setValue('phoneNumber', emp.phone || '')
      form.setValue('username', emp.phone || emp.id.substring(0, 8))

      // 自动匹配部门权限
      const deptId = emp.deptId
      if (deptId) {
        const matchedRoleId = resolveDepartmentRoleId(dynamicRoles, deptId)
        if (matchedRoleId) {
          form.setValue('role', matchedRoleId)
          form.clearErrors('role')
        } else {
          form.setValue('role', '')
          form.setError('role', {
            type: 'manual',
            message: t('users.validation.employeeDeptRoleRequired'),
          })
        }
      }
    }
  }, [employees, form, isEdit, dynamicRoles, t])

  return {
    selectedEmployeeId,
    selectedEmployee,
    selectedEmployeeDeptRoleId,
    isEmployeeBoundRoleLocked,
    handleEmployeeSync,
  }
}

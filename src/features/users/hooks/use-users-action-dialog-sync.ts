import { useMemo, useCallback } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { type Role } from '@/features/system-mgmt/data/role-schema'
import { type EmployeeOption, type UserForm } from '../components/users-action-dialog.shared'
import { resolveDepartmentRoleId, resolveDepartmentRoleIdFromEmployee } from '../utils/department-role'

type UseUsersActionDialogSyncParams = {
  employees: EmployeeOption[]
  dynamicRoles: Role[]
  form: UseFormReturn<UserForm>
  isEdit: boolean
}

export function useUsersActionDialogSync({
  employees,
  dynamicRoles,
  form,
  isEdit,
}: UseUsersActionDialogSyncParams) {
  const selectedEmployeeId = form.watch('employeeId')

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.value === selectedEmployeeId)?.raw,
    [employees, selectedEmployeeId]
  )

  const selectedEmployeeDeptRoleId = useMemo(() => {
    return resolveDepartmentRoleIdFromEmployee(dynamicRoles, selectedEmployee)
  }, [dynamicRoles, selectedEmployee])

  const handleEmployeeSync = useCallback((empId: string) => {
    if (!empId || isEdit) return

    const empOption = employees.find((employee) => employee.value === empId)
    const emp = empOption?.raw

    if (!emp) return

    const name = emp.name || ''
    const lastName = name.charAt(0)
    const firstName = name.length > 1 ? name.substring(1) : ''

    form.setValue('lastName', lastName)
    form.setValue('firstName', firstName)
    form.setValue('phoneNumber', emp.phone || '')
    form.setValue('username', emp.phone || emp.id.substring(0, 8))

    const deptId = emp.deptId
    if (!deptId) return

    const currentRole = (form.getValues('role') || '').trim()
    if (currentRole) return

    const matchedRoleId = resolveDepartmentRoleId(dynamicRoles, deptId)
    if (matchedRoleId) {
      form.setValue('role', matchedRoleId)
      form.clearErrors('role')
    }
  }, [employees, form, isEdit, dynamicRoles])

  return {
    selectedEmployeeId,
    selectedEmployee,
    selectedEmployeeDeptRoleId,
    handleEmployeeSync,
  }
}

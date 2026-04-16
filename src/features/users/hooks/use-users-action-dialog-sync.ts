import { useMemo, useCallback } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { type EmployeeOption, type UserForm } from '../components/users-action-dialog.shared'

type UseUsersActionDialogSyncParams = {
  employees: EmployeeOption[]
  form: UseFormReturn<UserForm>
  isEdit: boolean
}

export function useUsersActionDialogSync({
  employees,
  form,
  isEdit,
}: UseUsersActionDialogSyncParams) {
  const selectedEmployeeId = form.watch('employeeId')

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.value === selectedEmployeeId)?.raw,
    [employees, selectedEmployeeId]
  )

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
  }, [employees, form, isEdit])

  return {
    selectedEmployeeId,
    selectedEmployee,
    handleEmployeeSync,
  }
}

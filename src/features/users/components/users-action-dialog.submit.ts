import { type User } from '../data/schema'
import { type CreateUserPayload, type UserReplacePayload } from '../services/user-api'
import { type UserForm } from './users-action-dialog.shared'

export function resolveSubmitRole(params: {
  currentRow?: User
  isEmployeeBoundRoleLocked: boolean
  roleFromForm: string
}) {
  const { currentRow, isEmployeeBoundRoleLocked, roleFromForm } = params

  return isEmployeeBoundRoleLocked
    ? (currentRow?.role || roleFromForm).trim()
    : roleFromForm.trim()
}

export function buildUserReplacePayload(params: {
  currentRow: User
  resolvedRole: string
  values: UserForm
}): UserReplacePayload {
  const { currentRow, resolvedRole, values } = params
  const payload: UserReplacePayload = {
    username: values.username.trim(),
    phoneNumber: values.phoneNumber?.trim() || '',
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    status: currentRow.status,
    role: resolvedRole,
    employeeId: values.employeeId?.trim() || currentRow.employeeId || undefined,
  }

  const normalizedPassword = values.password.trim()
  if (normalizedPassword) {
    payload.password = normalizedPassword
  }

  return payload
}

export function buildUserCreatePayload(params: {
  resolvedRole: string
  values: UserForm
}): CreateUserPayload {
  const { resolvedRole, values } = params

  return {
    username: values.username.trim(),
    password: values.password.trim(),
    phoneNumber: values.phoneNumber?.trim() || '',
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    role: resolvedRole,
    employeeId: values.employeeId?.trim() || undefined,
  }
}

export function buildDialogCloseHandler(params: {
  onOpenChange: (open: boolean) => void
  reset: () => void
}) {
  const { onOpenChange, reset } = params

  return (nextOpen: boolean) => {
    reset()
    onOpenChange(nextOpen)
  }
}

export function buildSubmitSuccessHandler(params: {
  closeDialog: (open: boolean) => void
  successMessage: string
  toastSuccess: (message: string) => void
}) {
  const { closeDialog, successMessage, toastSuccess } = params

  return () => {
    closeDialog(false)
    toastSuccess(successMessage)
  }
}

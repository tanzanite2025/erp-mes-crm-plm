import { type User } from '../data/schema'
import { type CreateUserPayload } from '../services/user-api'
import { type UserForm } from './users-action-dialog.shared'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import { type DeltaSet } from '@/lib/delta/types'

/**
 * 使用 ProxyTracker 构建局部更新的 Delta 载荷
 */
export function buildUserDelta(params: {
  currentRow: User
  values: UserForm
}): DeltaSet {
  const { currentRow, values } = params
  
  const tracker = trackDelta(currentRow)
  const draft = tracker.data as User
  
  draft.username = values.username.trim()
  draft.phoneNumber = values.phoneNumber?.trim() || ''
  draft.firstName = values.firstName.trim()
  draft.lastName = values.lastName.trim()
  
  if (values.password && values.password.trim()) {
    draft.password = values.password.trim()
  }

  return tracker.commit()
}

export function buildUserCreatePayload(params: {
  values: UserForm
}): CreateUserPayload {
  const { values } = params

  return {
    username: values.username.trim(),
    password: values.password.trim(),
    phoneNumber: values.phoneNumber?.trim() || '',
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
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

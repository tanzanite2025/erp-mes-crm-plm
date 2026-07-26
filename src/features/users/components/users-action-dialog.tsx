'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { usePermissionPresetsQuery } from '@/features/system-mgmt/hooks/use-permission-presets'
import { type User } from '../data/schema'
import { useUserMutations, useUserOptionsQuery } from '../hooks/use-users'
import { useUsersActionDialogOptions } from '../hooks/use-users-action-dialog-options'
import { useUsersActionDialogSync } from '../hooks/use-users-action-dialog-sync'
import { UserActionIdentityFields } from './user-action-identity-fields'
import { UserActionSecurityFields } from './user-action-security-fields'
import { getFormSchema, type UserForm } from './users-action-dialog.shared'
import {
  buildDialogCloseHandler,
  buildSubmitSuccessHandler,
  buildUserCreatePayload,
  buildUserReplacePayload,
} from './users-action-dialog.submit'

type UserActionDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

function buildEmptyUserForm(isEdit: boolean): UserForm {
  return {
    firstName: '',
    lastName: '',
    username: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    isEdit,
    employeeId: '',
    permissionPresetId: '',
    initialPermissionPresetId: '',
    adminChallenge: '',
  }
}

function buildExistingUserForm(user: User): UserForm {
  return {
    ...user,
    password: '',
    confirmPassword: '',
    isEdit: true,
    permissionPresetId: user.permissionPresetId || '',
    initialPermissionPresetId: user.permissionPresetId || '',
    adminChallenge: '',
  }
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const { t } = useLanguage()
  const isEdit = !!currentRow
  const { allowsPermission } = usePermissionActions()
  const canManageAccountBindings = allowsPermission('perm_manage')
  const { data: userOptions } = useUserOptionsQuery(
    {},
    canManageAccountBindings
  )
  const { data: permissionPresets = [] } =
    usePermissionPresetsQuery(canManageAccountBindings)
  const form = useForm<UserForm>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: currentRow
      ? buildExistingUserForm(currentRow)
      : buildEmptyUserForm(false),
  })

  const { employees } = useUsersActionDialogOptions({
    open,
    enabled: canManageAccountBindings,
    currentRow,
    usersData: userOptions,
    t,
  })
  const { handleEmployeeSync } = useUsersActionDialogSync({
    employees,
    form,
    isEdit,
  })
  const { createMutation, replaceMutation } = useUserMutations()

  useEffect(() => {
    if (!open) return
    form.reset(
      currentRow ? buildExistingUserForm(currentRow) : buildEmptyUserForm(false)
    )
  }, [open, currentRow, form])

  const handleDialogOpenChange = buildDialogCloseHandler({
    onOpenChange,
    reset: () => form.reset(),
  })
  const handleCreateSuccess = buildSubmitSuccessHandler({
    closeDialog: handleDialogOpenChange,
    successMessage: t('users.toast.saveSuccessCreated'),
    toastSuccess: toast.success,
  })
  const handleUpdateSuccess = buildSubmitSuccessHandler({
    closeDialog: handleDialogOpenChange,
    successMessage: t('users.toast.saveSuccessUpdated'),
    toastSuccess: toast.success,
  })

  const onSubmit = async (values: UserForm) => {
    try {
      if (currentRow) {
        await replaceMutation.mutateAsync({
          id: currentRow.id,
          data: buildUserReplacePayload({ currentRow, values }),
          user: currentRow,
        })
        handleUpdateSuccess()
        return
      }

      await createMutation.mutateAsync(buildUserCreatePayload({ values }))
      handleCreateSuccess()
    } catch {
      // Mutation-level error handling is centralized in React Query helpers.
    }
  }

  const selectedPermissionPresetId =
    useWatch({ control: form.control, name: 'permissionPresetId' })
      ?.trim()
      .toLowerCase() || ''
  const initialPermissionPresetId = useWatch({
    control: form.control,
    name: 'initialPermissionPresetId',
  })
    .trim()
    .toLowerCase()
  const requiresAdminChallenge =
    selectedPermissionPresetId === 'admin' &&
    initialPermissionPresetId !== 'admin'

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className='gap-0 overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl sm:max-w-xl'>
        <DialogHeader className='relative border-b border-dashed border-muted/50 bg-muted/5 p-8 text-start'>
          <div className='pointer-events-none absolute top-8 right-8 opacity-5 select-none'>
            <UserPlus className='h-12 w-12' />
          </div>
          <div className='flex items-start justify-between gap-3'>
            <DialogTitle className='flex flex-col gap-0.5 text-lg font-black tracking-tighter uppercase italic'>
              <span>
                {isEdit
                  ? t('users.dialogs.editTitle')
                  : t('users.dialogs.createTitle')}
              </span>
              <span className='font-mono text-[9px] tracking-widest opacity-40'>
                {isEdit
                  ? 'ACCOUNT_PROFILE_RECOVERY'
                  : 'PROVISION_CONTROL_CLUSTER'}
              </span>
            </DialogTitle>
            {currentRow ? (
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.user}
                targetId={currentRow.id}
                targetName={currentRow.username}
                className='bg-background/70'
              />
            ) : null}
          </div>
          <DialogDescription className='mt-2 text-[10px] font-black tracking-widest uppercase opacity-60'>
            {isEdit
              ? t('users.dialogs.editSubtitle')
              : t('users.dialogs.createSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='user-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-6 p-8'
            >
              <UserActionIdentityFields
                form={form}
                employees={employees}
                isEdit={isEdit}
                canManageEmployeeBinding={canManageAccountBindings}
                onEmployeeSync={handleEmployeeSync}
              />
              <UserActionSecurityFields
                form={form}
                permissionPresets={permissionPresets}
                isEdit={isEdit}
                isPasswordTouched={!!form.formState.dirtyFields.password}
                canManagePermissionPresets={canManageAccountBindings}
                requiresAdminChallenge={requiresAdminChallenge}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className='border-t border-dashed border-muted/50 bg-muted/5 p-6'>
          <Button
            type='submit'
            form='user-form'
            className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95'
          >
            {t('users.dialogs.buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

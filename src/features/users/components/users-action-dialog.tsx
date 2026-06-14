'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link2Off, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { PasswordInput } from '@/components/password-input'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { useRolesQuery } from '@/features/system-mgmt/hooks/use-roles'
import { type User } from '../data/schema'
import { useUserMutations, useUserOptionsQuery } from '../hooks/use-users'
import { useUsersActionDialogOptions } from '../hooks/use-users-action-dialog-options'
import { useUsersActionDialogSync } from '../hooks/use-users-action-dialog-sync'
import { getFormSchema, type UserForm } from './users-action-dialog.shared'
import {
  buildDialogCloseHandler,
  buildSubmitSuccessHandler,
  buildUserCreatePayload,
  buildUserReplacePayload,
} from './users-action-dialog.submit'

const UNASSIGNED_ROLE_VALUE = '__unassigned_role__'

type UserActionDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const { t } = useLanguage()
  const { data: userOptions } = useUserOptionsQuery({})
  const { data: roles = [] } = useRolesQuery()
  const isEdit = !!currentRow

  const form = useForm<UserForm>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: isEdit
      ? {
          ...currentRow,
          password: '',
          confirmPassword: '',
          isEdit,
        }
      : {
          firstName: '',
          lastName: '',
          username: '',
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          isEdit,
          employeeId: '',
          role: '',
        },
  })

  const { employees } = useUsersActionDialogOptions({
    open,
    currentRow,
    usersData: userOptions,
    t,
  })
  const { handleEmployeeSync } = useUsersActionDialogSync({
    employees,
    form,
    isEdit,
  })

  useEffect(() => {
    if (!open) return

    if (isEdit && currentRow) {
      form.reset({
        ...currentRow,
        password: '',
        confirmPassword: '',
        isEdit: true,
        role: currentRow.role || '',
      })
      return
    }

    form.reset({
      firstName: '',
      lastName: '',
      username: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      isEdit: false,
      employeeId: '',
      role: '',
    })
  }, [open, isEdit, currentRow, form])

  const {
    createMutation,
    replaceMutation,
    bindEmployeeMutation,
    unbindEmployeeMutation,
  } = useUserMutations()
  const handleDialogOpenChange = buildDialogCloseHandler({
    onOpenChange,
    reset: () => {},
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
      if (isEdit && currentRow) {
        const payload = buildUserReplacePayload({
          currentRow,
          values,
        })
        const nextEmployeeID = values.employeeId?.trim() || ''
        const currentEmployeeID = currentRow.employeeId?.trim() || ''
        const employeeChanged = nextEmployeeID !== currentEmployeeID

        await replaceMutation.mutateAsync({
          id: currentRow.id,
          data: payload,
          user: currentRow,
        })

        if (employeeChanged) {
          if (nextEmployeeID) {
            await bindEmployeeMutation.mutateAsync({
              id: currentRow.id,
              employeeId: nextEmployeeID,
            })
          } else if (currentEmployeeID) {
            await unbindEmployeeMutation.mutateAsync({
              id: currentRow.id,
            })
          }
        }

        handleUpdateSuccess()
        return
      }

      const payload = buildUserCreatePayload({
        values,
      })

      await createMutation.mutateAsync(payload)
      handleCreateSuccess()
    } catch {
      // Mutation-level error handling is centralized in React Query helpers.
    }
  }

  const isPasswordTouched = !!form.formState.dirtyFields.password

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
            {isEdit && currentRow ? (
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
              <FormField
                control={form.control}
                name='employeeId'
                render={({ field }) => (
                  <FormItem className='mb-6 grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1 rounded-[28px] border border-dashed border-primary/20 bg-primary/5 p-6'>
                    <div className='col-span-2 flex flex-col items-end gap-0.5'>
                      <FormLabel className='text-[11px] leading-none font-black tracking-tight text-primary'>
                        {t('users.dialogs.labels.sync')}
                      </FormLabel>
                      <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-40'>
                        IDENTITY_SYNC
                      </span>
                    </div>
                    <div className='col-span-4 flex items-center gap-2'>
                      <div className='min-w-0 flex-1'>
                        <Combobox
                          variant='industrial'
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleEmployeeSync(value)
                          }}
                          placeholder={t('users.dialogs.placeholders.sync')}
                          searchPlaceholder={t(
                            'users.dialogs.placeholders.syncSearch'
                          )}
                          emptyText={t('users.dialogs.placeholders.syncEmpty')}
                          options={employees}
                        />
                      </div>
                      {isEdit && field.value ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          className='size-10 rounded-2xl border-dashed'
                          onClick={() => field.onChange('')}
                        >
                          <Link2Off className='size-4' />
                        </Button>
                      ) : null}
                    </div>
                    <div className='col-span-4 col-start-3 mt-1 text-[9px] font-black tracking-widest uppercase opacity-50'>
                      {t('users.dialogs.hints.sync')}
                    </div>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <div className='col-span-2 flex flex-col items-end gap-0.5'>
                      <FormLabel className='text-[11px] leading-none font-black tracking-tight text-muted-foreground/60'>
                        {t('users.dialogs.labels.firstName')}
                      </FormLabel>
                      <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-20'>
                        FIRST_NAME
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        disabled
                        placeholder={t('users.dialogs.placeholders.firstName')}
                        className='col-span-4 h-11 cursor-not-allowed rounded-2xl border-none bg-muted/40 px-4 text-xs font-bold opacity-70 shadow-inner'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <div className='col-span-2 flex flex-col items-end gap-0.5'>
                      <FormLabel className='text-[11px] leading-none font-black tracking-tight text-muted-foreground/60'>
                        {t('users.dialogs.labels.lastName')}
                      </FormLabel>
                      <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-20'>
                        LAST_NAME
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        disabled
                        placeholder={t('users.dialogs.placeholders.lastName')}
                        className='col-span-4 h-11 cursor-not-allowed rounded-2xl border-none bg-muted/40 px-4 text-xs font-bold opacity-70 shadow-inner'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <div className='col-span-2 flex flex-col items-end gap-0.5'>
                      <FormLabel className='text-[11px] leading-none font-black tracking-tight text-muted-foreground/60'>
                        {t('users.dialogs.labels.username')}
                      </FormLabel>
                      <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-20'>
                        AUTH_IDENTIFIER
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        placeholder={t('users.dialogs.placeholders.username')}
                        className='col-span-4 h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner transition-all focus-visible:ring-primary/20'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    {(() => {
                      const selectedRole = roles.find(
                        (role) => role.id === (field.value || '')
                      )
                      return (
                        <>
                          <div className='col-span-2 flex flex-col items-end gap-0.5'>
                            <FormLabel className='text-[11px] leading-none font-black tracking-tight text-muted-foreground/60'>
                              {t('users.dialogs.labels.role')}
                            </FormLabel>
                            <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-20'>
                              ROLE_BINDING
                            </span>
                          </div>
                          <div className='col-span-4 flex items-center gap-2'>
                            <FormControl>
                              <Select
                                value={field.value || UNASSIGNED_ROLE_VALUE}
                                onValueChange={(value) =>
                                  field.onChange(
                                    value === UNASSIGNED_ROLE_VALUE ? '' : value
                                  )
                                }
                              >
                                <SelectTrigger className='h-11 w-full rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner'>
                                  <SelectValue
                                    placeholder={t(
                                      'users.dialogs.placeholders.role'
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={UNASSIGNED_ROLE_VALUE}>
                                    {t('users.dialogs.placeholders.roleEmpty')}
                                  </SelectItem>
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.label || role.id}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            {field.value ? (
                              <AuditTimelineTriggerButton
                                module={AUDIT_MODULES.role}
                                targetId={field.value}
                                targetName={
                                  selectedRole?.label ||
                                  selectedRole?.id ||
                                  field.value
                                }
                                label={t('common.audit.roleTrigger')}
                                className='shrink-0'
                              />
                            ) : null}
                          </div>
                          <FormMessage className='col-span-4 col-start-3' />
                        </>
                      )
                    })()}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='phoneNumber'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <div className='col-span-2 flex flex-col items-end gap-0.5'>
                      <FormLabel className='text-[11px] leading-none font-black tracking-tight text-muted-foreground/60'>
                        {t('users.dialogs.labels.phone')}
                      </FormLabel>
                      <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-20'>
                        CONTACT_PROTO
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        disabled
                        placeholder={t('users.dialogs.placeholders.phone')}
                        className='col-span-4 h-11 cursor-not-allowed rounded-2xl border-none bg-muted/40 px-4 text-xs font-bold opacity-70 shadow-inner'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <div className='col-span-2 flex flex-col items-end gap-0.5'>
                      <FormLabel className='text-[11px] leading-none font-black tracking-tight text-muted-foreground/60'>
                        {t('users.dialogs.labels.password')}
                      </FormLabel>
                      <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-20'>
                        SECURITY_CRED
                      </span>
                    </div>
                    <FormControl>
                      <PasswordInput
                        placeholder={
                          isEdit
                            ? t('users.dialogs.placeholders.passwordEdit')
                            : t('users.dialogs.placeholders.passwordCreate')
                        }
                        containerClassName='col-span-4'
                        className='h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner transition-all focus-visible:ring-primary/20'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <div className='col-span-2 flex flex-col items-end gap-0.5'>
                      <FormLabel className='text-[11px] leading-none font-black tracking-tight text-muted-foreground/60'>
                        {t('users.dialogs.labels.confirm')}
                      </FormLabel>
                      <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-20'>
                        CRED_VERIFICATION
                      </span>
                    </div>
                    <FormControl>
                      <PasswordInput
                        disabled={!isPasswordTouched}
                        placeholder={
                          isEdit
                            ? t('users.dialogs.placeholders.confirmEdit')
                            : t('users.dialogs.placeholders.confirmCreate')
                        }
                        containerClassName='col-span-4'
                        className='h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner transition-all focus-visible:ring-primary/20 disabled:opacity-30'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
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

'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link2Off, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Combobox } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
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
import { PasswordInput } from '@/components/password-input'
import { useLanguage } from '@/context/language-provider'
import { type User } from '../data/schema'
import { useUserMutations, useUserOptionsQuery } from '../hooks/use-users'
import { useUsersActionDialogOptions } from '../hooks/use-users-action-dialog-options'
import { useUsersActionDialogSync } from '../hooks/use-users-action-dialog-sync'
import { getFormSchema, type UserForm } from './users-action-dialog.shared'
import {
  buildDialogCloseHandler,
  buildSubmitSuccessHandler,
  buildUserCreatePayload,
  buildUserDelta,
} from './users-action-dialog.submit'

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
    })
  }, [open, isEdit, currentRow, form])

  const {
    createMutation,
    updateMutation,
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
        const delta = buildUserDelta({
          currentRow,
          values,
        })
        const nextEmployeeID = values.employeeId?.trim() || ''
        const currentEmployeeID = currentRow.employeeId?.trim() || ''
        const employeeChanged = nextEmployeeID !== currentEmployeeID

        if (Object.keys(delta).length > 0) {
          await updateMutation.mutateAsync({
            id: currentRow.id,
            delta,
            version: currentRow.version || 1,
          })
        }

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
      <DialogContent className='sm:max-w-xl rounded-[32px] border-none shadow-2xl p-0 gap-0 overflow-hidden bg-background'>
        <DialogHeader className='text-start bg-muted/5 p-8 border-b border-dashed border-muted/50 relative'>
          <div className='absolute right-8 top-8 opacity-5 select-none pointer-events-none'>
            <UserPlus className='h-12 w-12' />
          </div>
          <DialogTitle className='text-lg font-black tracking-tighter italic uppercase flex flex-col gap-0.5'>
            <span>{isEdit ? t('users.dialogs.editTitle') : t('users.dialogs.createTitle')}</span>
            <span className='text-[9px] font-mono opacity-40 tracking-widest'>
              {isEdit ? 'ACCOUNT_PROFILE_RECOVERY' : 'PROVISION_CONTROL_CLUSTER'}
            </span>
          </DialogTitle>
          <DialogDescription className='text-[10px] font-black uppercase tracking-widest opacity-60 mt-2'>
            {isEdit ? t('users.dialogs.editSubtitle') : t('users.dialogs.createSubtitle')}
          </DialogDescription>
        </DialogHeader>
        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form id='user-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-6 p-8'>
              <FormField
                control={form.control}
                name='employeeId'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1 bg-primary/5 p-6 rounded-[28px] border border-dashed border-primary/20 mb-6'>
                    <div className='col-span-2 flex flex-col items-end gap-0.5'>
                      <FormLabel className='text-[11px] font-black tracking-tight text-primary leading-none'>
                        {t('users.dialogs.labels.sync')}
                      </FormLabel>
                      <span className='text-[8px] font-mono font-black uppercase tracking-widest opacity-40 leading-none'>
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
                          searchPlaceholder='搜索姓名或部门名称...'
                          emptyText='未找到对应员工记录'
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
                    <div className='col-span-4 col-start-3 text-[9px] font-black uppercase tracking-widest opacity-50 mt-1'>
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
                      <FormLabel className='text-[11px] font-black tracking-tight text-muted-foreground/60 leading-none'>
                        {t('users.dialogs.labels.firstName')}
                      </FormLabel>
                      <span className='text-[8px] font-mono font-black uppercase tracking-widest opacity-20 leading-none'>
                        FIRST_NAME
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        disabled
                        placeholder={t('users.dialogs.placeholders.firstName')}
                        className='col-span-4 h-11 rounded-2xl bg-muted/40 border-none shadow-inner font-bold text-xs px-4 opacity-70 cursor-not-allowed'
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
                      <FormLabel className='text-[11px] font-black tracking-tight text-muted-foreground/60 leading-none'>
                        {t('users.dialogs.labels.lastName')}
                      </FormLabel>
                      <span className='text-[8px] font-mono font-black uppercase tracking-widest opacity-20 leading-none'>
                        LAST_NAME
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        disabled
                        placeholder={t('users.dialogs.placeholders.lastName')}
                        className='col-span-4 h-11 rounded-2xl bg-muted/40 border-none shadow-inner font-bold text-xs px-4 opacity-70 cursor-not-allowed'
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
                      <FormLabel className='text-[11px] font-black tracking-tight text-muted-foreground/60 leading-none'>
                        {t('users.dialogs.labels.username')}
                      </FormLabel>
                      <span className='text-[8px] font-mono font-black uppercase tracking-widest opacity-20 leading-none'>
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
                name='phoneNumber'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <div className='col-span-2 flex flex-col items-end gap-0.5'>
                      <FormLabel className='text-[11px] font-black tracking-tight text-muted-foreground/60 leading-none'>
                        {t('users.dialogs.labels.phone')}
                      </FormLabel>
                      <span className='text-[8px] font-mono font-black uppercase tracking-widest opacity-20 leading-none'>
                        CONTACT_PROTO
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        disabled
                        placeholder={t('users.dialogs.placeholders.phone')}
                        className='col-span-4 h-11 rounded-2xl bg-muted/40 border-none shadow-inner font-bold text-xs px-4 opacity-70 cursor-not-allowed'
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
                      <FormLabel className='text-[11px] font-black tracking-tight text-muted-foreground/60 leading-none'>
                        {t('users.dialogs.labels.password')}
                      </FormLabel>
                      <span className='text-[8px] font-mono font-black uppercase tracking-widest opacity-20 leading-none'>
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
                      <FormLabel className='text-[11px] font-black tracking-tight text-muted-foreground/60 leading-none'>
                        {t('users.dialogs.labels.confirm')}
                      </FormLabel>
                      <span className='text-[8px] font-mono font-black uppercase tracking-widest opacity-20 leading-none'>
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
        <DialogFooter className='p-6 bg-muted/5 border-t border-dashed border-muted/50'>
          <Button
            type='submit'
            form='user-form'
            className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
          >
            {t('users.dialogs.buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

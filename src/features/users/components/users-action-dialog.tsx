'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
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
import { SelectDropdown } from '@/components/select-dropdown'
import { type User } from '../data/schema'
import { useUserMutations, useUserOptionsQuery } from '../hooks/use-users'
import { useUsersActionDialogOptions } from '../hooks/use-users-action-dialog-options'
import { useUsersActionDialogSync } from '../hooks/use-users-action-dialog-sync'
import { useRoles } from '@/features/system-mgmt/hooks/use-roles'
import { getFormSchema, type UserForm } from './users-action-dialog.shared'
import {
  buildUserCreatePayload,
  buildDialogCloseHandler,
  buildUserReplacePayload,
  buildSubmitSuccessHandler,
  resolveSubmitRole,
} from './users-action-dialog.submit'
import { useLanguage } from '@/context/language-provider'
import { toast } from 'sonner'

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
  const { t, locale } = useLanguage()
  const { roles: dynamicRoles } = useRoles()
  const { data: userOptions } = useUserOptionsQuery({})
  const isEdit = !!currentRow
  const roleFieldLabel =
    locale === 'zh-CN' ? '所属角色 / 系统管理员' : 'Assigned Role / System Admin'
  const roleFieldPlaceholder =
    locale === 'zh-CN' ? '请选择所属角色或系统管理员' : 'Select assigned role or system admin'
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
        role: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        isEdit,
        employeeId: '',
      },
  })
  const { employees, combinedRoleOptions } = useUsersActionDialogOptions({
    open,
    isEdit,
    usersData: userOptions,
    dynamicRoles,
    t,
  })
  const { selectedEmployeeDeptRoleId, isEmployeeBoundRoleLocked, handleEmployeeSync } = useUsersActionDialogSync({
    employees,
    currentRow,
    dynamicRoles,
    form,
    isEdit,
    t,
  })

  // 【生命周期治理】确保 Dialog 开启或数据源变更时，表单状态彻底同步
  useEffect(() => {
    if (open) {
      if (isEdit && currentRow) {
        form.reset({
          ...currentRow,
          password: '',
          confirmPassword: '',
          isEdit: true,
        })
      } else {
        form.reset({
          firstName: '',
          lastName: '',
          username: '',
          role: '',
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          isEdit: false,
          employeeId: '',
        })
      }
    }
  }, [open, isEdit, currentRow, form])

  const { createMutation, replaceMutation } = useUserMutations()
  const handleDialogOpenChange = buildDialogCloseHandler({
    onOpenChange,
    reset: () => {}, // 移至 useEffect 统一处理
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

  const onSubmit = (values: UserForm) => {
    if (!isEdit && values.employeeId && !selectedEmployeeDeptRoleId) {
      form.setError('role', {
        type: 'manual',
        message: t('users.validation.employeeDeptRoleRequired'),
      })
      toast.error(t('users.validation.employeeDeptRoleRequired'))
      return
    }

    const resolvedRole = resolveSubmitRole({
      currentRow,
      isEmployeeBoundRoleLocked,
      roleFromForm: values.role,
    })

    if (!resolvedRole) {
      form.setError('role', {
        type: 'manual',
        message: t('users.validation.roleRequired'),
      })
      toast.error(t('users.validation.roleRequired'))
      return
    }

    if (isEdit && currentRow) {
      const payload = buildUserReplacePayload({
        currentRow,
        resolvedRole,
        values,
      })

      replaceMutation.mutate({ id: currentRow.id, data: payload }, {
        onSuccess: handleUpdateSuccess,
      })
    } else {
      const payload = buildUserCreatePayload({
        resolvedRole,
        values,
      })

      createMutation.mutate(payload, {
        onSuccess: handleCreateSuccess,
      })
    }
  }

  const isPasswordTouched = !!form.formState.dirtyFields.password

  return (
    <Dialog
      open={open}
      onOpenChange={handleDialogOpenChange}
    >
      <DialogContent className='sm:max-w-xl rounded-[32px] border-none shadow-2xl p-0 gap-0 overflow-hidden bg-background'>
        <DialogHeader className='text-start bg-muted/5 p-8 border-b border-dashed border-muted/50'>
          <DialogTitle className='text-lg font-black tracking-tighter italic uppercase'>{isEdit ? t('users.dialogs.editTitle') : t('users.dialogs.createTitle')}</DialogTitle>
          <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
            {isEdit ? t('users.dialogs.editSubtitle') : t('users.dialogs.createSubtitle')}
          </DialogDescription>
        </DialogHeader>
        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='user-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-6 p-8'
            >
              {!isEdit && (
                <FormField
                  control={form.control}
                  name='employeeId'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1 bg-primary/5 p-4 rounded-2xl border border-dashed border-primary/20 mb-4'>
                      <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest text-primary'>
                        <div className='flex items-center justify-end gap-1'>
                          <UserPlus className='h-3 w-3' /> {t('users.dialogs.labels.sync')}
                        </div>
                      </FormLabel>
                      <SelectDropdown
                        defaultValue={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          handleEmployeeSync(value)
                        }}
                        placeholder={t('users.dialogs.placeholders.sync')}
                        className='col-span-4 h-11 rounded-2xl bg-background border-none shadow-inner font-bold text-xs'
                        items={employees}
                      />
                      <div className='col-span-4 col-start-3 text-[9px] font-black uppercase tracking-widest opacity-50 mt-1'>
                        {t('users.dialogs.hints.sync')}
                      </div>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('users.dialogs.labels.firstName')}
                    </FormLabel>
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
                    <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('users.dialogs.labels.lastName')}
                    </FormLabel>
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
                    <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('users.dialogs.labels.username')}
                    </FormLabel>
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
                    <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('users.dialogs.labels.phone')}
                    </FormLabel>
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
                name='role'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{roleFieldLabel}</FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder={roleFieldPlaceholder}
                      disabled={isEmployeeBoundRoleLocked}
                      className='col-span-4 h-11 rounded-2xl bg-muted/50 border-none shadow-inner font-bold text-xs'
                      items={combinedRoleOptions}
                    />
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                    <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('users.dialogs.labels.password')}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={isEdit ? t('users.dialogs.placeholders.passwordEdit') : t('users.dialogs.placeholders.passwordCreate')}
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
                    <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('users.dialogs.labels.confirm')}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        disabled={!isPasswordTouched}
                        placeholder={isEdit ? t('users.dialogs.placeholders.confirmEdit') : t('users.dialogs.placeholders.confirmCreate')}
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

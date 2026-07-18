import { type UseFormReturn } from 'react-hook-form'
import { Link2Off } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  type EmployeeOption,
  type UserForm,
} from './users-action-dialog.shared'

type UserActionIdentityFieldsProps = {
  form: UseFormReturn<UserForm>
  employees: EmployeeOption[]
  isEdit: boolean
  canManageEmployeeBinding: boolean
  onEmployeeSync: (employeeID: string) => void
}

export function UserActionIdentityFields({
  form,
  employees,
  isEdit,
  canManageEmployeeBinding,
  onEmployeeSync,
}: UserActionIdentityFieldsProps) {
  const { t } = useLanguage()
  const identityLocked = Boolean(form.watch('employeeId')?.trim())

  return (
    <>
      {canManageEmployeeBinding ? (
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
                      onEmployeeSync(value)
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
      ) : null}

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
                disabled={identityLocked}
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
                disabled={identityLocked}
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
                disabled={identityLocked}
                placeholder={t('users.dialogs.placeholders.phone')}
                className='col-span-4 h-11 cursor-not-allowed rounded-2xl border-none bg-muted/40 px-4 text-xs font-bold opacity-70 shadow-inner'
                {...field}
              />
            </FormControl>
            <FormMessage className='col-span-4 col-start-3' />
          </FormItem>
        )}
      />
    </>
  )
}

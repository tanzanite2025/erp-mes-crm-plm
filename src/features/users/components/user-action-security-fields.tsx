import { type UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import { type Role } from '@/features/system-mgmt/data/role-schema'
import { type UserForm } from './users-action-dialog.shared'

const UNASSIGNED_ROLE_VALUE = '__unassigned_role__'

type UserActionSecurityFieldsProps = {
  form: UseFormReturn<UserForm>
  roles: Role[]
  isEdit: boolean
  isPasswordTouched: boolean
  canManageRoles: boolean
  requiresAdminChallenge: boolean
}

export function UserActionSecurityFields({
  form,
  roles,
  isEdit,
  isPasswordTouched,
  canManageRoles,
  requiresAdminChallenge,
}: UserActionSecurityFieldsProps) {
  const { t } = useLanguage()

  return (
    <>
      {canManageRoles ? (
        <FormField
          control={form.control}
          name='role'
          render={({ field }) => {
            const selectedRole = roles.find(
              (role) => role.id === (field.value || '')
            )
            return (
              <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
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
                          placeholder={t('users.dialogs.placeholders.role')}
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
                        selectedRole?.label || selectedRole?.id || field.value
                      }
                      label={t('common.audit.roleTrigger')}
                      className='shrink-0'
                    />
                  ) : null}
                </div>
                <FormMessage className='col-span-4 col-start-3' />
              </FormItem>
            )
          }}
        />
      ) : null}

      {requiresAdminChallenge ? (
        <FormField
          control={form.control}
          name='adminChallenge'
          render={({ field }) => (
            <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
              <div className='col-span-2 flex flex-col items-end gap-0.5'>
                <FormLabel className='text-[11px] leading-none font-black tracking-tight text-destructive/80'>
                  {t('users.dialogs.labels.adminChallenge')}
                </FormLabel>
                <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-30'>
                  PRIVILEGE_CONFIRM
                </span>
              </div>
              <FormControl>
                <PasswordInput
                  placeholder={t('users.dialogs.placeholders.adminChallenge')}
                  containerClassName='col-span-4'
                  className='h-11 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 text-xs font-bold shadow-inner transition-all focus-visible:ring-destructive/20'
                  autoComplete='current-password'
                  {...field}
                />
              </FormControl>
              <FormMessage className='col-span-4 col-start-3' />
            </FormItem>
          )}
        />
      ) : null}

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
    </>
  )
}

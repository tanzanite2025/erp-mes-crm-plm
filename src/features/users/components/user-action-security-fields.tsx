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
import { type PermissionPreset } from '@/features/system-mgmt/data/permission-preset-schema'
import { type UserForm } from './users-action-dialog.shared'

const UNASSIGNED_PERMISSION_PRESET_VALUE = '__unassigned_permission_preset__'

type UserActionSecurityFieldsProps = {
  form: UseFormReturn<UserForm>
  permissionPresets: PermissionPreset[]
  isEdit: boolean
  isPasswordTouched: boolean
  canManagePermissionPresets: boolean
  requiresAdminChallenge: boolean
}

export function UserActionSecurityFields({
  form,
  permissionPresets,
  isEdit,
  isPasswordTouched,
  canManagePermissionPresets,
  requiresAdminChallenge,
}: UserActionSecurityFieldsProps) {
  const { t } = useLanguage()

  return (
    <>
      {canManagePermissionPresets ? (
        <FormField
          control={form.control}
          name='permissionPresetId'
          render={({ field }) => {
            const selectedPermissionPreset = permissionPresets.find(
              (permissionPreset) => permissionPreset.id === (field.value || '')
            )
            return (
              <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-6 gap-y-1'>
                <div className='col-span-2 flex flex-col items-end gap-0.5'>
                  <FormLabel className='text-[11px] leading-none font-black tracking-tight text-muted-foreground/60'>
                    {t('users.dialogs.labels.permissionPreset')}
                  </FormLabel>
                  <span className='font-mono text-[8px] leading-none font-black tracking-widest uppercase opacity-20'>
                    ACCESS_PRESET
                  </span>
                </div>
                <div className='col-span-4 flex items-center gap-2'>
                  <FormControl>
                    <Select
                      value={field.value || UNASSIGNED_PERMISSION_PRESET_VALUE}
                      onValueChange={(value) =>
                        field.onChange(
                          value === UNASSIGNED_PERMISSION_PRESET_VALUE ? '' : value
                        )
                      }
                    >
                      <SelectTrigger className='h-11 w-full rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner'>
                        <SelectValue
                          placeholder={t(
                            'users.dialogs.placeholders.permissionPreset'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_PERMISSION_PRESET_VALUE}>
                          {t(
                            'users.dialogs.placeholders.permissionPresetEmpty'
                          )}
                        </SelectItem>
                        {permissionPresets.map((permissionPreset) => (
                          <SelectItem
                            key={permissionPreset.id}
                            value={permissionPreset.id}
                          >
                            {permissionPreset.label || permissionPreset.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  {field.value ? (
                    <AuditTimelineTriggerButton
                      module={AUDIT_MODULES.permissionPreset}
                      targetId={field.value}
                      targetName={
                        selectedPermissionPreset?.label ||
                        selectedPermissionPreset?.id ||
                        field.value
                      }
                      label={t('common.audit.permissionPresetTrigger')}
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

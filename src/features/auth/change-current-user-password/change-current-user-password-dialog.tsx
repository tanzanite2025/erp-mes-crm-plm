import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
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
import { Label } from '@/components/ui/label'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import {
  buildHostedQuickActionDialogContentClassName,
  hostedQuickActionDialogScrollableBodyClassName,
} from '@/components/hosted-quick-action-dialog.styles'
import { PasswordInput } from '@/components/password-input'
import { changeCurrentAuthenticatedUserPassword } from './change-current-user-password-api-service'
import { getNewUserPasswordPolicyError } from './new-user-password-policy-validation'

type ChangeCurrentUserPasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const changeCurrentUserPasswordDialogClasses = buildActionDialogShellClasses({
  content: 'flex flex-col gap-0 sm:max-w-xl',
  header: 'border-muted/50 bg-muted/5 p-6 text-start sm:p-8',
  body: 'p-6 sm:p-8',
  title: 'flex items-center gap-2 text-lg',
  description:
    'text-xs leading-relaxed font-bold tracking-normal normal-case opacity-70',
  footer: 'shrink-0 border-muted/50',
})

const changeCurrentUserPasswordFieldClassName =
  'grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center sm:gap-x-6'
const changeCurrentUserPasswordLabelClassName =
  'text-[11px] font-black tracking-tight text-muted-foreground sm:justify-end'
const changeCurrentUserPasswordInputClassName =
  'h-11 rounded-2xl border-none bg-muted/50 px-4 pr-12 text-xs font-bold shadow-inner transition-all focus-visible:ring-primary/20'

export function ChangeCurrentUserPasswordDialog({
  open,
  onOpenChange,
}: ChangeCurrentUserPasswordDialogProps) {
  // Mount only while open so closing the dialog always destroys password state.
  return open ? (
    <OpenCurrentUserPasswordChangeDialog onOpenChange={onOpenChange} />
  ) : null
}

function OpenCurrentUserPasswordChangeDialog({
  onOpenChange,
}: Pick<ChangeCurrentUserPasswordDialogProps, 'onOpenChange'>) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function submitCurrentUserPasswordChange(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    if (isSubmitting) return
    setErrorMessage('')
    if (!currentPassword) {
      setErrorMessage(t('common.auth.changePassword.currentPasswordRequired'))
      return
    }
    const policyError = getNewUserPasswordPolicyError(newPassword)
    if (policyError) {
      setErrorMessage(t(`users.validation.${policyError}`))
      return
    }
    if (newPassword === currentPassword) {
      setErrorMessage(t('common.auth.changePassword.unchanged'))
      return
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage(t('users.validation.passwordMismatch'))
      return
    }

    const requestAccessToken = useAuthStore.getState().accessToken
    setIsSubmitting(true)
    try {
      await changeCurrentAuthenticatedUserPassword({
        currentPassword,
        newPassword,
      })
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? error.code
          : undefined
      const message =
        code === 'auth_current_password_incorrect'
          ? t('common.auth.changePassword.currentPasswordIncorrect')
          : code === 'auth_new_password_unchanged'
            ? t('common.auth.changePassword.unchanged')
            : code === 'auth_new_password_invalid'
              ? t('common.auth.changePassword.policy')
              : code === 'auth_password_change_rate_limited'
                ? t('common.auth.changePassword.rateLimited')
                : t('common.auth.changePassword.failed')
      setErrorMessage(message)
      setIsSubmitting(false)
      return
    }

    if (useAuthStore.getState().accessToken !== requestAccessToken) {
      onOpenChange(false)
      return
    }
    // Revoke local identity before yielding so older profile syncs cannot restore it.
    useAuthStore.getState().reset()
    const queryCancellation = queryClient.cancelQueries()
    queryClient.clear()
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    // Query cancellation failure must never strand an already-revoked session.
    await queryCancellation.catch(() => undefined)
    if (useAuthStore.getState().accessToken) {
      onOpenChange(false)
      return
    }
    toast.success(t('common.auth.changePassword.success'))
    onOpenChange(false)
    await navigate({
      to: '/sign-in',
      replace: true,
      search: { redirect: undefined },
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        className={buildHostedQuickActionDialogContentClassName(
          changeCurrentUserPasswordDialogClasses.content
        )}
        showCloseButton={!isSubmitting}
      >
        <DialogHeader className={changeCurrentUserPasswordDialogClasses.header}>
          <DialogTitle className={changeCurrentUserPasswordDialogClasses.title}>
            <KeyRound
              className='size-5 shrink-0 text-primary'
              aria-hidden='true'
            />
            {t('common.auth.changePassword.title')}
          </DialogTitle>
          <DialogDescription
            className={changeCurrentUserPasswordDialogClasses.description}
          >
            {t('common.auth.changePassword.description')}
          </DialogDescription>
        </DialogHeader>
        <form
          id='change-current-user-password-form'
          onSubmit={submitCurrentUserPasswordChange}
          data-mobile-floating-surface-scroll-body
          className={cn(
            hostedQuickActionDialogScrollableBodyClassName,
            changeCurrentUserPasswordDialogClasses.body,
            'space-y-6'
          )}
        >
          <fieldset disabled={isSubmitting} className='grid min-w-0 gap-6'>
            <div className={changeCurrentUserPasswordFieldClassName}>
              <Label
                htmlFor='change-current-user-current-password'
                className={changeCurrentUserPasswordLabelClassName}
              >
                {t('common.auth.changePassword.currentPassword')}
              </Label>
              <PasswordInput
                id='change-current-user-current-password'
                className={changeCurrentUserPasswordInputClassName}
                autoComplete='current-password'
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                aria-describedby={
                  errorMessage
                    ? 'change-current-user-password-error'
                    : undefined
                }
              />
            </div>
            <div className={changeCurrentUserPasswordFieldClassName}>
              <Label
                htmlFor='change-current-user-new-password'
                className={changeCurrentUserPasswordLabelClassName}
              >
                {t('common.auth.changePassword.newPassword')}
              </Label>
              <PasswordInput
                id='change-current-user-new-password'
                className={changeCurrentUserPasswordInputClassName}
                autoComplete='new-password'
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-describedby='change-current-user-password-policy'
              />
              <p
                id='change-current-user-password-policy'
                className='text-[11px] leading-relaxed text-muted-foreground sm:col-start-2'
              >
                {t('common.auth.changePassword.policy')}
              </p>
            </div>
            <div className={changeCurrentUserPasswordFieldClassName}>
              <Label
                htmlFor='change-current-user-confirm-password'
                className={changeCurrentUserPasswordLabelClassName}
              >
                {t('common.auth.changePassword.confirmPassword')}
              </Label>
              <PasswordInput
                id='change-current-user-confirm-password'
                className={changeCurrentUserPasswordInputClassName}
                autoComplete='new-password'
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
              />
            </div>
          </fieldset>
          {errorMessage && (
            <p
              id='change-current-user-password-error'
              role='alert'
              className='rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs leading-relaxed font-bold text-destructive'
            >
              {errorMessage}
            </p>
          )}
        </form>
        <DialogFooter className={changeCurrentUserPasswordDialogClasses.footer}>
          <Button
            type='button'
            variant='ghost'
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest uppercase'
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            type='submit'
            form='change-current-user-password-form'
            disabled={isSubmitting}
            className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/20 transition-all active:scale-95'
          >
            {isSubmitting && (
              <Loader2 className='size-4 animate-spin' aria-hidden='true' />
            )}
            {t('common.auth.changePassword.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

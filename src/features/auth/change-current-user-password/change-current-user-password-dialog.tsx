import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
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
import { PasswordInput } from '@/components/password-input'
import { changeCurrentAuthenticatedUserPassword } from './change-current-user-password-api-service'
import { getNewUserPasswordPolicyError } from './new-user-password-policy-validation'

type ChangeCurrentUserPasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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
      <DialogContent size='md' showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>{t('common.auth.changePassword.title')}</DialogTitle>
          <DialogDescription>
            {t('common.auth.changePassword.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submitCurrentUserPasswordChange} className='grid gap-4'>
          <fieldset disabled={isSubmitting} className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='change-current-user-current-password'>
                {t('common.auth.changePassword.currentPassword')}
              </Label>
              <PasswordInput
                id='change-current-user-current-password'
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
            <div className='grid gap-2'>
              <Label htmlFor='change-current-user-new-password'>
                {t('common.auth.changePassword.newPassword')}
              </Label>
              <PasswordInput
                id='change-current-user-new-password'
                autoComplete='new-password'
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-describedby='change-current-user-password-policy'
              />
              <p
                id='change-current-user-password-policy'
                className='text-xs text-muted-foreground'
              >
                {t('common.auth.changePassword.policy')}
              </p>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='change-current-user-confirm-password'>
                {t('common.auth.changePassword.confirmPassword')}
              </Label>
              <PasswordInput
                id='change-current-user-confirm-password'
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
              className='text-sm text-destructive'
            >
              {errorMessage}
            </p>
          )}
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className='size-4 animate-spin' aria-hidden='true' />
              )}
              {t('common.auth.changePassword.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

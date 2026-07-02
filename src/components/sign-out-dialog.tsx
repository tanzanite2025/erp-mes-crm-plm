import { useLocation, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api-client'
import { useLanguage } from '@/context/language-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const { reset } = useAuthStore()

  const handleSignOut = async () => {
    try {
      await apiFetch<{ status: string }>('/auth/logout', {
        method: 'POST',
        ignoreBreaker: true,
      })
    } catch (_error) {
      // Continue local sign-out even if the server logout request fails.
    } finally {
      reset()
      const currentPath = location.href
      navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('common.auth.signOutTitle')}
      desc={t('common.auth.signOutDescription')}
      confirmText={t('common.actions.signOut')}
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}

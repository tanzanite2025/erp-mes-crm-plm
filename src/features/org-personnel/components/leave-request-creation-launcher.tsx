import { lazy, Suspense, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'

const LeaveActionDialog = lazy(() =>
  import('./leave-action-dialog').then((module) => ({
    default: module.LeaveActionDialog,
  }))
)

export function LeaveRequestCreationLauncher() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { allowsPermission } = usePermissionActions()
  const [isOpen, setIsOpen] = useState(false)

  // The leave API currently requires menu_org, including preview and submit.
  if (
    !allowsPermission('menu_org') ||
    !matchesPathPermissionProjection(user, '/attendance-management/leave')
  )
    return null

  function navigateToLeaveManagementAfterSuccessfulSubmission() {
    void navigate({ to: '/attendance-management/leave' })
  }

  return (
    <div className='space-y-2'>
      <Button
        type='button'
        className='rounded-full px-5'
        onClick={() => setIsOpen(true)}
      >
        <Plus aria-hidden='true' className='size-4' />
        {t('orgPersonnel.leaveMgmt.createRequest')}
      </Button>
      <p className='text-xs leading-6 text-muted-foreground'>
        {t(
          'orgPersonnel.attendanceOperationGuide.actions.successNavigationHint'
        )}
      </p>
      {isOpen && (
        <Suspense
          fallback={
            <p role='status'>
              {t('orgPersonnel.attendanceOperationGuide.actions.loadingForm')}
            </p>
          }
        >
          <LeaveActionDialog
            open
            onOpenChange={setIsOpen}
            onSubmitted={navigateToLeaveManagementAfterSuccessfulSubmission}
          />
        </Suspense>
      )}
    </div>
  )
}

import { lazy, Suspense, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  personnelRecordCreationActions,
  type PersonnelRecordCreationType,
} from '../data/personnel-record-creation-action-definitions'

const PersonnelRecordCreationDialog = lazy(() =>
  import('./personnel-record-creation-dialog').then((module) => ({
    default: module.PersonnelRecordCreationDialog,
  }))
)

/** Opens a single shared creation form; business lists stay on their own routes. */
export function PersonnelRecordCreationLauncher({
  recordType,
}: {
  recordType: PersonnelRecordCreationType
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const { allowsPermission } = usePermissionActions()
  const [isOpen, setIsOpen] = useState(false)
  const action = personnelRecordCreationActions[recordType]

  if (
    !allowsPermission('user_create') ||
    !matchesPathPermissionProjection(user, action.destination)
  )
    return null

  return (
    <div className='space-y-2'>
      <Button
        type='button'
        className='rounded-full px-5'
        onClick={() => setIsOpen(true)}
      >
        <Plus aria-hidden='true' className='size-4' />
        {t(action.labelKey)}
      </Button>
      <p className='text-xs leading-6 text-muted-foreground'>
        {t('orgPersonnel.operationGuide.actions.successNavigationHint')}
      </p>
      {isOpen && (
        <Suspense
          fallback={
            <p role='status'>
              {t('orgPersonnel.operationGuide.actions.loadingForm')}
            </p>
          }
        >
          <PersonnelRecordCreationDialog
            recordType={recordType}
            onOpenChange={setIsOpen}
          />
        </Suspense>
      )}
    </div>
  )
}

import { lazy, Suspense, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { type BOM } from '../../data/schema'

const BOMCreationGuideDraftDialog = lazy(() =>
  import('./bom-creation-guide-draft-dialog').then((module) => ({
    default: module.BOMCreationGuideDraftDialog,
  }))
)

/** Only mounts the existing business editor after an authorized, explicit click. */
export function BOMCreationGuideDraftEntry({
  presentation = 'card',
}: {
  presentation?: 'card' | 'inline'
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const { isChecking, allowsAction, allowsPermission } = usePermissionActions()
  const [isOpen, setIsOpen] = useState(false)
  const [savedBOM, setSavedBOM] = useState<BOM | null>(null)
  const canReadBOMPage = matchesPathPermissionProjection(
    user,
    '/product-structure/bom'
  )
  const canCreateDraft =
    !isChecking &&
    canReadBOMPage &&
    allowsPermission('menu_engineering') &&
    allowsAction('action_engineering_bom_manage')

  return (
    <div
      className={
        presentation === 'inline'
          ? 'min-w-0 space-y-2'
          : 'space-y-3 rounded-xl border bg-card p-4'
      }
    >
      {presentation === 'card' && (
        <p className='text-sm leading-7 text-muted-foreground'>
          {t('engineering.bomCreationGuide.draftEntry.description')}
        </p>
      )}
      <div className='flex flex-wrap items-center gap-3'>
        <Button
          type='button'
          disabled={!canCreateDraft}
          onClick={() => setIsOpen(true)}
          className={
            presentation === 'inline'
              ? 'h-auto min-h-9 w-full bg-violet-700 py-2 text-start text-xs whitespace-normal text-white hover:bg-violet-800 dark:bg-violet-500 dark:text-violet-950 dark:hover:bg-violet-400'
              : undefined
          }
        >
          <Plus aria-hidden='true' className='size-4' />
          {t(
            presentation === 'inline'
              ? 'engineering.productAndBOMResponsibilities.bom.entry'
              : 'engineering.bomCreationGuide.draftEntry.open'
          )}
        </Button>
        {presentation === 'card' && canReadBOMPage && (
          <Link
            to='/product-structure/bom'
            className='text-sm text-sky-700 hover:underline dark:text-sky-300'
          >
            {t('engineering.bomCreationGuide.references.bom')}
          </Link>
        )}
      </div>
      {!canCreateDraft && (
        <p className='text-xs leading-6 text-muted-foreground'>
          {t(
            isChecking
              ? 'engineering.bomCreationGuide.draftEntry.checking'
              : 'engineering.bomCreationGuide.draftEntry.noPermission'
          )}
        </p>
      )}
      {savedBOM && (
        <p
          role='status'
          className='text-sm leading-7 text-sky-700 dark:text-sky-300'
        >
          {t(
            savedBOM.status === 'RELEASED'
              ? 'engineering.bomCreationGuide.draftEntry.published'
              : 'engineering.bomCreationGuide.draftEntry.saved',
            {
              bomNo: savedBOM.bomNo || savedBOM.id,
            }
          )}
        </p>
      )}
      {isOpen && canCreateDraft && (
        <Suspense
          fallback={
            <p role='status' className='text-sm'>
              {t('engineering.bomCreationGuide.draftEntry.loading')}
            </p>
          }
        >
          <BOMCreationGuideDraftDialog
            onClose={() => setIsOpen(false)}
            onSaved={(bom) => {
              setSavedBOM(bom)
              setIsOpen(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

import { lazy, Suspense, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { useQualityMutations } from '../hooks/use-quality'
import { buildControlledProtocolStandard } from '../services/controlled-protocol-standard-factory'
import type { ControlledProtocolDraft } from '../types/controlled-protocol'
import { QualityInspectionStageManagementDialog } from './quality-inspection-stage-management-dialog'

const ControlledProtocolDialog = lazy(() =>
  import('./controlled-protocol-dialog').then((module) => ({
    default: module.ControlledProtocolDialog,
  }))
)

/** Opens the existing quality-standard creation flow from the handbook. */
export function QualityStandardCreationGuideBusinessEntry() {
  const { isChecking, allowsPermission } = usePermissionActions()
  const canCreateQualityStandard =
    !isChecking &&
    allowsPermission('menu_quality') &&
    allowsPermission('menu_engineering') &&
    allowsPermission('perm_manage')

  if (!canCreateQualityStandard) return null

  return <AuthorizedQualityStandardCreationGuideBusinessEntry />
}

function AuthorizedQualityStandardCreationGuideBusinessEntry() {
  const { t } = useLanguage()
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false)
  const [isInspectionStageManagementOpen, setIsInspectionStageManagementOpen] =
    useState(false)
  const { saveStandardMutation } = useQualityMutations()
  const isSavingQualityStandardRef = useRef(false)

  async function saveQualityStandardCreatedFromGuide(
    draft: ControlledProtocolDraft
  ) {
    if (isSavingQualityStandardRef.current) return
    isSavingQualityStandardRef.current = true
    try {
      await saveStandardMutation.mutateAsync({
        data: buildControlledProtocolStandard(draft),
        successMessage: t(
          'quality.standards.dialog.controlledProtocol.toastCreated',
          { count: draft.criteria.length }
        ),
      })
      setIsCreationDialogOpen(false)
    } catch {
      return
    } finally {
      isSavingQualityStandardRef.current = false
    }
  }

  return (
    <div className='mx-2 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-sky-200/70 bg-sky-50/45 px-4 py-3 md:mx-4 dark:border-sky-900/60 dark:bg-sky-950/20'>
      <p className='text-xs leading-5 text-muted-foreground'>
        {t('quality.standardCreationGuide.businessEntryHint')}
      </p>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='rounded-full border-sky-600/20 bg-background px-3 text-sky-700 hover:bg-sky-50 dark:border-sky-400/30 dark:text-sky-300 dark:hover:bg-sky-950/40'
        disabled={saveStandardMutation.isPending}
        onClick={() => setIsCreationDialogOpen(true)}
      >
        <Plus aria-hidden='true' className='size-3.5' />
        {t('quality.standardCreationGuide.quickCreate')}
      </Button>
      {isCreationDialogOpen ? (
        <Suspense
          fallback={
            <p role='status' className='w-full text-xs text-muted-foreground'>
              {t('quality.standardCreationGuide.quickCreateLoading')}
            </p>
          }
        >
          <ControlledProtocolDialog
            open
            onOpenChange={(open) => {
              if (!isSavingQualityStandardRef.current)
                setIsCreationDialogOpen(open)
            }}
            onSubmit={saveQualityStandardCreatedFromGuide}
            isSubmitting={saveStandardMutation.isPending}
            onManageInspectionStages={() =>
              setIsInspectionStageManagementOpen(true)
            }
          />
        </Suspense>
      ) : null}
      {isInspectionStageManagementOpen ? (
        <QualityInspectionStageManagementDialog
          open
          onOpenChange={setIsInspectionStageManagementOpen}
        />
      ) : null}
    </div>
  )
}

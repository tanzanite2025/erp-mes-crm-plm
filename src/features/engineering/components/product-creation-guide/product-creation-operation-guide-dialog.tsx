import { useAuthStore } from '@/stores/auth-store'
import { useProductCreationGuideSession } from '../../hooks/use-product-creation-guide-session'
import { ProductCreationGuideBusinessOperationDialog } from './product-creation-guide-business-operation-dialog'
import { ProductCreationGuideCompletionSummaryDialog } from './product-creation-guide-completion-summary-dialog'
import { ProductCreationGuideStepNavigation } from './product-creation-guide-step-navigation'

export function ProductCreationOperationGuideDialog({
  onClose,
}: {
  onClose: () => void
}) {
  const user = useAuthStore((state) => state.user)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)
  if (!isIdentitySynced || !user) return null
  return (
    <ProductCreationOperationGuideDialogSession
      key={user.id}
      accountId={user.id}
      onClose={onClose}
    />
  )
}

function ProductCreationOperationGuideDialogSession({
  accountId,
  onClose,
}: {
  accountId: string
  onClose: () => void
}) {
  const session = useProductCreationGuideSession({ accountId, onClose })
  const {
    progress,
    activeStepKey,
    steps,
    activeStep,
    isBusy,
    setIsBusy,
    isBomEditorOpen,
    productResult,
    recordVerification,
    selectProductCreationWizardStep,
    completeProductCreationWizardStep,
  } = session
  const { verifiedProduct, verifiedBom } = recordVerification

  const wizardHeader = (
    <ProductCreationGuideStepNavigation
      steps={steps}
      activeStepKey={activeStepKey}
      progress={progress}
      verifiedRecordCompletion={
        productResult
          ? { product: Boolean(verifiedProduct), bom: Boolean(verifiedBom) }
          : undefined
      }
      isBusy={isBusy}
      onSelectStep={selectProductCreationWizardStep}
    />
  )

  if (activeStep.canAccess && !(activeStepKey === 'bom' && !isBomEditorOpen)) {
    return (
      <ProductCreationGuideBusinessOperationDialog
        key={activeStepKey}
        step={activeStep}
        progress={progress}
        wizardHeader={wizardHeader}
        onBusyChange={setIsBusy}
        onClose={() => {
          if (!isBusy) onClose()
        }}
        onCompleted={completeProductCreationWizardStep}
      />
    )
  }

  return (
    <ProductCreationGuideCompletionSummaryDialog
      session={session}
      wizardHeader={wizardHeader}
      onClose={onClose}
    />
  )
}

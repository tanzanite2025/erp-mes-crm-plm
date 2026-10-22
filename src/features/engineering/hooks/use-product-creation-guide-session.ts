import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { buildProductCreationOperationGuideSteps } from '../data/build-product-creation-operation-guide-steps'
import {
  completeProductCreationGuideStep,
  createEmptyProductCreationGuideProgress,
  getCurrentProductCreationGuideStep,
  productCreationGuideProgressSchema,
  type ProductCreationGuideProgress,
  type ProductCreationGuideStepResult,
  type ProductCreationOperationGuideStepKey,
} from '../data/product-creation-operation-guide-progress'
import { useProductCreationGuideSavedRecordVerification } from './use-product-creation-guide-saved-record-verification'

const logger = createLogger('ProductCreationOperationGuideDialog')

function readSavedProductCreationGuideProgress(storageKey: string) {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      const parsed = productCreationGuideProgressSchema.safeParse(
        JSON.parse(stored)
      )
      if (parsed.success) return parsed.data
    }
  } catch (error) {
    logger.warn('Could not read product creation guide progress', error)
  }
  return createEmptyProductCreationGuideProgress()
}

export function useProductCreationGuideSession({
  accountId,
  onClose,
}: {
  accountId: string
  onClose: () => void
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const storageKey = `product-creation-operation-guide:v1:${accountId}`
  const [progress, setProgress] = useState<ProductCreationGuideProgress>(() =>
    readSavedProductCreationGuideProgress(storageKey)
  )
  const [activeStepKey, setActiveStepKey] =
    useState<ProductCreationOperationGuideStepKey>(
      () => getCurrentProductCreationGuideStep(progress) ?? 'bom'
    )
  const [isBusy, setIsBusy] = useState(false)
  const [isBomEditorOpen, setIsBomEditorOpen] = useState(false)
  const [isRestartConfirmationVisible, setIsRestartConfirmationVisible] =
    useState(false)
  const steps = useMemo(
    () => buildProductCreationOperationGuideSteps(user, t),
    [t, user]
  )
  const activeStep = steps.find((step) => step.key === activeStepKey)!
  const productResult = progress.completedSteps.product
  const isCompletionSummary = activeStepKey === 'bom' && Boolean(productResult)
  const canViewProduct = steps.some(
    (step) => step.key === 'product' && step.canAccess
  )
  const canViewBom = steps.some((step) => step.key === 'bom' && step.canAccess)
  const recordVerification = useProductCreationGuideSavedRecordVerification({
    savedProduct: productResult,
    savedBom: progress.completedSteps.bom,
    canViewProduct,
    canViewBom,
  })
  const { verifiedBom, productStatus, bomStatus } = recordVerification
  const canContinueBom =
    productStatus !== 'missing' &&
    (bomStatus === 'verified' ? !verifiedBom : !progress.completedSteps.bom)

  function updateAndPersistProductCreationGuideProgress(
    nextProgress: ProductCreationGuideProgress
  ) {
    setProgress(nextProgress)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextProgress))
    } catch (error) {
      logger.warn('Could not persist product creation guide progress', error)
      toast.error(t('engineering.productCreationGuide.storageFailed'))
    }
  }

  function selectProductCreationWizardStep(
    stepKey: ProductCreationOperationGuideStepKey
  ) {
    if (isBusy) return
    if (stepKey === 'product' && productStatus === 'missing') {
      const { template, baseModel } = progress.completedSteps
      updateAndPersistProductCreationGuideProgress({
        completedSteps: { template, baseModel },
        bomSkipped: false,
      })
    }
    setActiveStepKey(stepKey)
    setIsBomEditorOpen(false)
    setIsRestartConfirmationVisible(false)
  }

  function completeProductCreationWizardStep(
    result: ProductCreationGuideStepResult
  ) {
    updateAndPersistProductCreationGuideProgress(
      completeProductCreationGuideStep(progress, activeStepKey, result)
    )
    setIsBusy(false)
    setIsBomEditorOpen(false)
    const nextStep =
      steps[steps.findIndex((step) => step.key === activeStepKey) + 1]
    if (nextStep) setActiveStepKey(nextStep.key)
  }

  function restartProductCreationGuide() {
    updateAndPersistProductCreationGuideProgress(
      createEmptyProductCreationGuideProgress()
    )
    setActiveStepKey('template')
    setIsRestartConfirmationVisible(false)
  }

  function cancelProductCreationGuideRestartConfirmation() {
    setIsRestartConfirmationVisible(false)
  }

  function showProductCreationGuideRestartConfirmation() {
    setIsRestartConfirmationVisible(true)
  }

  function openProductCreationGuideBomEditor() {
    setIsBomEditorOpen(true)
  }

  function finishProductCreationGuide() {
    if (
      isCompletionSummary &&
      productStatus !== 'missing' &&
      !progress.completedSteps.bom
    )
      updateAndPersistProductCreationGuideProgress({
        ...progress,
        bomSkipped: true,
      })
    onClose()
  }

  return {
    progress,
    activeStepKey,
    steps,
    activeStep,
    isBusy,
    setIsBusy,
    isBomEditorOpen,
    productResult,
    isCompletionSummary,
    canViewProduct,
    recordVerification,
    canContinueBom,
    isRestartConfirmationVisible,
    selectProductCreationWizardStep,
    completeProductCreationWizardStep,
    restartProductCreationGuide,
    cancelProductCreationGuideRestartConfirmation,
    showProductCreationGuideRestartConfirmation,
    openProductCreationGuideBomEditor,
    finishProductCreationGuide,
  }
}

export type ProductCreationGuideSessionState = ReturnType<
  typeof useProductCreationGuideSession
>

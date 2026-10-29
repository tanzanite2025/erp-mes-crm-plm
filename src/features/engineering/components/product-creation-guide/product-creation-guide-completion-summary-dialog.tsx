import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
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
import type { ProductCreationGuideSessionState } from '../../hooks/use-product-creation-guide-session'
import { productCreationGuideDialogContentClassName } from '../product-creation-dialog-layout.styles'

type ProductCreationGuideCompletionSummaryDialogProps = {
  session: Pick<
    ProductCreationGuideSessionState,
    | 'activeStep'
    | 'activeStepKey'
    | 'productResult'
    | 'isCompletionSummary'
    | 'canViewProduct'
    | 'recordVerification'
    | 'canContinueBom'
    | 'isRestartConfirmationVisible'
    | 'selectProductCreationWizardStep'
    | 'restartProductCreationGuide'
    | 'cancelProductCreationGuideRestartConfirmation'
    | 'showProductCreationGuideRestartConfirmation'
    | 'openProductCreationGuideBomEditor'
    | 'finishProductCreationGuide'
  >
  wizardHeader: ReactNode
  onClose: () => void
}

export function ProductCreationGuideCompletionSummaryDialog({
  session,
  wizardHeader,
  onClose,
}: ProductCreationGuideCompletionSummaryDialogProps) {
  const { t } = useLanguage()
  const {
    activeStep,
    activeStepKey,
    productResult,
    isCompletionSummary,
    canViewProduct,
    recordVerification,
    canContinueBom,
    isRestartConfirmationVisible,
    selectProductCreationWizardStep,
    restartProductCreationGuide,
    cancelProductCreationGuideRestartConfirmation,
    showProductCreationGuideRestartConfirmation,
    openProductCreationGuideBomEditor,
    finishProductCreationGuide,
  } = session
  const { verifiedProduct, verifiedBom, productStatus, bomStatus } =
    recordVerification

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className={productCreationGuideDialogContentClassName}>
        {wizardHeader}
        <DialogHeader className='shrink-0 px-5 pt-5 text-start'>
          <DialogTitle>
            {isCompletionSummary && verifiedProduct
              ? t('engineering.productCreationGuide.productComplete')
              : isCompletionSummary
                ? t('engineering.productCreationGuide.savedResult')
                : activeStep.title}
          </DialogTitle>
          <DialogDescription>
            {isCompletionSummary && verifiedProduct
              ? t('engineering.productCreationGuide.productCompleteDescription')
              : isCompletionSummary
                ? t('engineering.productCreationGuide.recordVerificationHint')
                : t('engineering.productCreationGuide.accessRequired')}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto p-5'>
          {isCompletionSummary && verifiedProduct && (
            <div className='flex flex-wrap items-center gap-3 rounded-xl bg-primary/5 p-4'>
              <CheckCircle2
                aria-hidden='true'
                className='size-6 shrink-0 text-primary'
              />
              <div>
                <p className='text-sm font-semibold'>{verifiedProduct.label}</p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {verifiedProduct.code}
                </p>
              </div>
              {canViewProduct && (
                <Button
                  asChild
                  variant='outline'
                  size='sm'
                  className='ml-auto rounded-full'
                >
                  <Link
                    to='/engineering/products'
                    search={{ productId: verifiedProduct.id }}
                    onClick={onClose}
                  >
                    {t('engineering.productCreationGuide.viewProduct')}
                  </Link>
                </Button>
              )}
            </div>
          )}
          {isCompletionSummary && !verifiedProduct && (
            <div role='status' className='space-y-3 rounded-xl border p-4'>
              <p className='text-sm font-semibold'>{productResult?.label}</p>
              <p className='text-sm text-muted-foreground'>
                {t(
                  productStatus === 'missing'
                    ? 'engineering.productCreationGuide.productRecordMissing'
                    : productStatus === 'unavailable'
                      ? 'engineering.productCreationGuide.productVerificationUnavailable'
                      : productStatus === 'error'
                        ? 'engineering.productCreationGuide.productVerificationFailed'
                        : 'engineering.productCreationGuide.productVerificationChecking'
                )}
              </p>
              {productStatus === 'missing' && canViewProduct && (
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-full'
                  onClick={() => selectProductCreationWizardStep('product')}
                >
                  {t('engineering.productCreationGuide.returnToProductStep')}
                </Button>
              )}
            </div>
          )}
          {isCompletionSummary &&
            (productStatus === 'error' || bomStatus === 'error') && (
              <Button
                variant='outline'
                size='sm'
                className='rounded-full'
                onClick={recordVerification.retrySavedProductAndBomVerification}
              >
                {t('engineering.productCreationGuide.retry')}
              </Button>
            )}
          {!activeStep.canAccess && (
            <p role='status' className='text-sm text-muted-foreground'>
              {activeStep.pageLabel} ·{' '}
              {t('engineering.productCreationGuide.accessRequired')}
            </p>
          )}
          {activeStepKey === 'bom' && productResult && (
            <>
              {verifiedBom ? (
                <p className='text-sm'>
                  {t('engineering.productCreationGuide.bomComplete')}：
                  {verifiedBom.label}
                </p>
              ) : bomStatus === 'verified' ? (
                <p className='text-sm text-muted-foreground'>
                  {t('engineering.productCreationGuide.optionalBomDescription')}
                </p>
              ) : bomStatus !== 'missing' ? (
                <p role='status' className='text-sm text-muted-foreground'>
                  {t(
                    bomStatus === 'unavailable'
                      ? 'engineering.productCreationGuide.bomVerificationUnavailable'
                      : bomStatus === 'error'
                        ? 'engineering.productCreationGuide.bomVerificationFailed'
                        : 'engineering.productCreationGuide.bomVerificationChecking'
                  )}
                </p>
              ) : null}
              {isRestartConfirmationVisible ? (
                <div className='space-y-3 rounded-lg border p-3'>
                  <p className='text-sm'>
                    {t(
                      'engineering.productCreationGuide.startAnotherDescription'
                    )}
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      className='rounded-full'
                      onClick={restartProductCreationGuide}
                    >
                      {t('engineering.productCreationGuide.confirm')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='rounded-full'
                      onClick={cancelProductCreationGuideRestartConfirmation}
                    >
                      {t('engineering.productCreationGuide.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-full'
                  onClick={showProductCreationGuideRestartConfirmation}
                >
                  {t('engineering.productCreationGuide.startAnother')}
                </Button>
              )}
            </>
          )}
        </div>
        <DialogFooter className='shrink-0 border-t p-4'>
          {isCompletionSummary && canContinueBom && activeStep.canAccess && (
            <Button
              variant='outline'
              className='rounded-full px-6'
              onClick={openProductCreationGuideBomEditor}
            >
              {t('engineering.productCreationGuide.createBom')}
            </Button>
          )}
          <Button
            className='rounded-full px-6'
            onClick={finishProductCreationGuide}
          >
            {t(
              isCompletionSummary && productStatus !== 'missing'
                ? 'engineering.productCreationGuide.finish'
                : 'engineering.productCreationGuide.close'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

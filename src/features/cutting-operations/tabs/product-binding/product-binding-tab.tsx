'use client'

import type { TranslationKey } from '@/locales'
import { Link2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { getCuttingOperationTabs } from '@/features/cutting-operations/tab-config'
import { ProductBindingFeedbackCard } from './components/product-binding-feedback-card'
import { ProductBindingFormSection } from './components/product-binding-form-section'
import { useProductBindingPageState } from './hooks/use-product-binding-page-state'
import { HistoryTableActionTrigger } from './product-binding-history-entry'

type CuttingOperationTabTranslator = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function ProductBindingTab() {
  const { t } = useLanguage()
  const tabTranslator: CuttingOperationTabTranslator = t
  const state = useProductBindingPageState()

  return (
    <ModuleTabbedLayout tabs={getCuttingOperationTabs(tabTranslator)}>
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          icon={Link2}
          title={t('cuttingOperations.productBinding.header.title')}
          description={t('cuttingOperations.productBinding.header.description')}
          gradient
        />

        <section className='relative overflow-hidden rounded-[24px] border border-dashed border-border/70 bg-background'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />
          <div className='relative p-4 sm:p-5'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-base font-black tracking-tight text-foreground italic'>
                {t('cuttingOperations.productBinding.form.title')}
              </p>
              <p className='max-w-3xl text-xs leading-5 font-medium text-muted-foreground'>
                {t('cuttingOperations.productBinding.form.description')}
              </p>
            </div>

            <div className='mt-5 grid min-w-0 gap-5'>
              <ProductBindingFormSection
                productBarcode={state.productBarcode}
                onProductBarcodeChange={(value) => {
                  state.setProductBarcode(value)
                  state.resetFeedback()
                }}
                prepregQrCode={state.prepregQrCode}
                onPrepregQrCodeChange={(value) => {
                  state.setPrepregQrCode(value)
                  state.resetFeedback()
                }}
                onSubmit={() => void state.handleSubmitBinding()}
                isSubmitting={state.submitBindingMutation.isPending}
                captureSession={state.barcodeCaptureSession}
                captureUrl={state.barcodeCaptureUrl}
                captureStatusMessage={state.barcodeCaptureStatusMessage}
                isCreatingCaptureSession={state.isCreatingBarcodeCaptureSession}
                onCreateCaptureSession={() =>
                  void state.handleCreateBarcodeCaptureSession()
                }
                onCopyCaptureLink={() =>
                  void state.handleCopyBarcodeCaptureLink()
                }
              />

              {state.feedbackState !== 'idle' ? (
                <ProductBindingFeedbackCard
                  feedbackState={state.feedbackState}
                  bindingResult={state.bindingResult}
                  submitError={state.submitError}
                  productBarcode={state.productBarcode}
                  prepregQrCode={state.prepregQrCode}
                />
              ) : null}
            </div>
          </div>
        </section>

        <div className='flex justify-end'>
          <HistoryTableActionTrigger
            latestBindingId={state.latestBindingId}
            defaultFilters={{
              limit: 12,
              productBarcode: state.productBarcode,
              prepregQrCode: state.prepregQrCode,
            }}
            showCount
          />
        </div>
      </div>
    </ModuleTabbedLayout>
  )
}

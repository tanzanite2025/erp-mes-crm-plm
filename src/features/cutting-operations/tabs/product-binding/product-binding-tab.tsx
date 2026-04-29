'use client'

import { Link2 } from 'lucide-react'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { getCuttingOperationTabs } from '@/features/cutting-operations/tab-config'
import type { TranslationKey } from '@/locales'
import { ProductBindingFeedbackCard } from './components/product-binding-feedback-card'
import { ProductBindingFormSection } from './components/product-binding-form-section'
import { HistoryTableActionTrigger } from './product-binding-history-entry'
import { useProductBindingPageState } from './hooks/use-product-binding-page-state'

type CuttingOperationTabTranslator = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function ProductBindingTab() {
  const { t } = useLanguage()
  const tabTranslator: CuttingOperationTabTranslator = t
  const state = useProductBindingPageState()

  return (
    <ModuleTabbedLayout
      title={t('sidebar.items.cuttingOperations')}
      tabs={getCuttingOperationTabs(tabTranslator)}
    >
      <div className='flex flex-col gap-6 animate-in fade-in duration-700'>
        <IndustrialHeader
          icon={Link2}
          title={t('cuttingOperations.productBinding.header.title')}
          description={t('cuttingOperations.productBinding.header.description')}
          gradient
        />

        <section className='relative overflow-hidden rounded-[24px] border border-dashed border-border/70 bg-background'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />
          <div className='relative p-4'>
            <div className='flex flex-col gap-2'>
              <p className='text-sm font-black italic tracking-tighter text-foreground'>
                {t('cuttingOperations.productBinding.form.title')}
              </p>
              <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {t('cuttingOperations.productBinding.form.description')}
              </p>
            </div>

            <div className='mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)] xl:items-start'>
              <div className='grid gap-4'>
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
                  onCreateCaptureSession={() => void state.handleCreateBarcodeCaptureSession()}
                  onCopyCaptureLink={() => void state.handleCopyBarcodeCaptureLink()}
                />
              </div>

              <ProductBindingFeedbackCard
                feedbackState={state.feedbackState}
                bindingResult={state.bindingResult}
                submitError={state.submitError}
                productBarcode={state.productBarcode}
                prepregQrCode={state.prepregQrCode}
              />
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

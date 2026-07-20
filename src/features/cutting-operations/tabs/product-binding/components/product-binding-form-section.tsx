import { Barcode, Link2, QrCode } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrackingNumberInput } from '@/components/tracking-number-input'
import type { ProductBarcodeCaptureSession } from '../services/product-barcode-capture-session-service'
import { ProductBarcodeMobileCapturePanel } from './product-barcode-mobile-capture-panel'

type ProductBindingFormSectionProps = {
  productBarcode: string
  onProductBarcodeChange: (value: string) => void
  prepregQrCode: string
  onPrepregQrCodeChange: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  captureSession: ProductBarcodeCaptureSession | null
  captureUrl: string
  captureStatusMessage: string
  isCreatingCaptureSession: boolean
  onCreateCaptureSession: () => void
  onCopyCaptureLink: () => void
}

export function ProductBindingFormSection(
  props: ProductBindingFormSectionProps
) {
  const { t } = useLanguage()
  const {
    productBarcode,
    onProductBarcodeChange,
    prepregQrCode,
    onPrepregQrCodeChange,
    onSubmit,
    isSubmitting,
    captureSession,
    captureUrl,
    captureStatusMessage,
    isCreatingCaptureSession,
    onCreateCaptureSession,
    onCopyCaptureLink,
  } = props

  return (
    <div className='grid min-w-0 gap-5'>
      <div className='grid min-w-0 gap-5 lg:grid-cols-2'>
        <div className='min-w-0 rounded-[20px] border border-dashed border-border/60 bg-muted/10 p-4 sm:p-5'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50'>
              <Barcode className='size-5 text-foreground' />
            </div>
            <div className='min-w-0'>
              <p className='text-xs font-semibold text-muted-foreground'>
                {t('cuttingOperations.productBinding.form.steps.step1')}
              </p>
              <p className='mt-1 text-base font-black tracking-tight text-foreground italic'>
                {t('cuttingOperations.productBinding.form.barcode.label')}
              </p>
            </div>
          </div>
          <div className='mt-4 grid gap-2'>
            <TrackingNumberInput
              value={productBarcode}
              onValueChange={onProductBarcodeChange}
              inputId='product-binding-product-barcode'
              inputAriaLabel={t(
                'cuttingOperations.productBinding.form.barcode.label'
              )}
              placeholder={t(
                'cuttingOperations.productBinding.form.barcode.placeholder'
              )}
              inputClassName='h-12 rounded-2xl border-none bg-muted/50 text-sm font-medium tracking-normal placeholder:font-medium placeholder:tracking-normal placeholder:normal-case'
              disabled={isSubmitting}
            />
            <p className='text-xs leading-5 font-medium text-muted-foreground'>
              {t('cuttingOperations.productBinding.form.barcode.hint')}
            </p>
          </div>
        </div>

        <div className='min-w-0 rounded-[20px] border border-dashed border-border/60 bg-muted/10 p-4 sm:p-5'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50'>
              <QrCode className='size-5 text-foreground' />
            </div>
            <div className='min-w-0'>
              <p className='text-xs font-semibold text-muted-foreground'>
                {t('cuttingOperations.productBinding.form.steps.step2')}
              </p>
              <p className='mt-1 text-base font-black tracking-tight text-foreground italic'>
                {t('cuttingOperations.productBinding.form.qr.label')}
              </p>
            </div>
          </div>
          <div className='mt-4 grid gap-2'>
            <Input
              id='product-binding-prepreg-qr'
              value={prepregQrCode}
              onChange={(event) => onPrepregQrCodeChange(event.target.value)}
              aria-label={t('cuttingOperations.productBinding.form.qr.label')}
              placeholder={t(
                'cuttingOperations.productBinding.form.qr.placeholder'
              )}
              className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-medium tracking-normal placeholder:font-medium placeholder:tracking-normal placeholder:normal-case'
              disabled={isSubmitting}
            />
            <p className='text-xs leading-5 font-medium text-muted-foreground'>
              {t('cuttingOperations.productBinding.form.qr.hint')}
            </p>
          </div>
        </div>
      </div>

      <ProductBarcodeMobileCapturePanel
        captureSession={captureSession}
        captureUrl={captureUrl}
        statusMessage={captureStatusMessage}
        isCreatingSession={isCreatingCaptureSession}
        onCreateSession={onCreateCaptureSession}
        onCopyLink={onCopyCaptureLink}
        compact
      />

      <div className='flex flex-wrap gap-3'>
        <Button
          type='button'
          onClick={onSubmit}
          disabled={isSubmitting}
          className='h-11 rounded-full px-6 text-xs font-bold tracking-normal'
        >
          <Link2 className='size-4' />
          {isSubmitting
            ? t('cuttingOperations.productBinding.form.actions.submitting')
            : t('cuttingOperations.productBinding.form.actions.submit')}
        </Button>
      </div>
    </div>
  )
}

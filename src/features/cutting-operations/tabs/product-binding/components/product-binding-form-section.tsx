import { Barcode, Link2, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/language-provider'
import { ProductBarcodeMobileCapturePanel } from './product-barcode-mobile-capture-panel'
import type { ProductBarcodeCaptureSession } from '../services/product-barcode-capture-session-service'

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

export function ProductBindingFormSection(props: ProductBindingFormSectionProps) {
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
    <div className='grid gap-4'>
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]'>
        <div className='rounded-[24px] border border-dashed border-border/60 bg-muted/10 p-4'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-2xl bg-muted/50'>
              <Barcode className='size-5 text-foreground' />
            </div>
            <div>
              <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {t('cuttingOperations.productBinding.form.steps.step1')}
              </p>
              <p className='mt-1 text-sm font-black italic tracking-tighter text-foreground'>
                {t('cuttingOperations.productBinding.form.barcode.label')}
              </p>
            </div>
          </div>
          <div className='mt-3 grid gap-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('cuttingOperations.productBinding.form.barcode.label')}
            </Label>
            <Input
              value={productBarcode}
              onChange={(event) => onProductBarcodeChange(event.target.value)}
              placeholder={t('cuttingOperations.productBinding.form.barcode.placeholder')}
              className='h-12 rounded-2xl border-none bg-muted/50 text-sm'
              disabled={isSubmitting}
            />
            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('cuttingOperations.productBinding.form.barcode.hint')}
            </p>
          </div>

          <div className='mt-3'>
            <ProductBarcodeMobileCapturePanel
              captureSession={captureSession}
              captureUrl={captureUrl}
              statusMessage={captureStatusMessage}
              isCreatingSession={isCreatingCaptureSession}
              onCreateSession={onCreateCaptureSession}
              onCopyLink={onCopyCaptureLink}
              compact
            />
          </div>
        </div>

        <div className='rounded-[24px] border border-dashed border-border/60 bg-muted/10 p-4'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-2xl bg-muted/50'>
              <QrCode className='size-5 text-foreground' />
            </div>
            <div>
              <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {t('cuttingOperations.productBinding.form.steps.step2')}
              </p>
              <p className='mt-1 text-sm font-black italic tracking-tighter text-foreground'>
                {t('cuttingOperations.productBinding.form.qr.label')}
              </p>
            </div>
          </div>
          <div className='mt-3 grid gap-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('cuttingOperations.productBinding.form.qr.label')}
            </Label>
            <Input
              value={prepregQrCode}
              onChange={(event) => onPrepregQrCodeChange(event.target.value)}
              placeholder={t('cuttingOperations.productBinding.form.qr.placeholder')}
              className='h-12 rounded-2xl border-none bg-muted/50 text-sm'
              disabled={isSubmitting}
            />
            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('cuttingOperations.productBinding.form.qr.hint')}
            </p>
          </div>
        </div>
      </div>

      <div className='flex flex-wrap gap-3'>
        <Button
          type='button'
          onClick={onSubmit}
          disabled={isSubmitting}
          className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
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

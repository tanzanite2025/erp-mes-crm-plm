import { useState } from 'react'
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrackingNumberInput } from '@/components/tracking-number-input'
import { useLanguage } from '@/context/language-provider'
import { ProductBarcodeCaptureSessionService } from '../services/product-barcode-capture-session-service'

interface ProductBarcodeMobileCapturePageProps {
  sessionId: string
  token: string
}

export function ProductBarcodeMobileCapturePage({
  sessionId,
  token,
}: ProductBarcodeMobileCapturePageProps) {
  const { t } = useLanguage()
  const [rawCode, setRawCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const submitCapturedCode = async (nextCode: string) => {
    if (!token) {
      setError(t('cuttingOperations.productBinding.mobileCapture.page.errors.missingToken'))
      return
    }
    if (!nextCode.trim()) {
      setError(t('cuttingOperations.productBinding.mobileCapture.page.errors.missingBarcode'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await ProductBarcodeCaptureSessionService.submit(sessionId, {
        token,
        rawCode: nextCode.trim(),
      })
      setSubmitted(true)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('cuttingOperations.productBinding.mobileCapture.page.errors.submitFailed'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className='min-h-dvh bg-background px-5 py-8 text-foreground'>
        <section className='mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center text-center'>
          <div className='flex size-20 items-center justify-center rounded-[28px] bg-emerald-500/10 text-emerald-600'>
            <CheckCircle2 className='size-10' />
          </div>
          <h1 className='mt-6 text-3xl font-black italic tracking-tighter'>
            {t('cuttingOperations.productBinding.mobileCapture.page.submitted.title')}
          </h1>
          <p className='mt-3 text-sm font-semibold leading-6 text-muted-foreground'>
            {t('cuttingOperations.productBinding.mobileCapture.page.submitted.description')}
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className='min-h-dvh bg-background px-4 py-5 text-foreground'>
      <section className='mx-auto max-w-md space-y-4'>
        <header className='rounded-[28px] border border-dashed border-muted-foreground/20 bg-muted/30 p-5'>
          <div className='flex items-center gap-3'>
            <div className='flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
              <Smartphone className='size-7' />
            </div>
            <div>
              <h1 className='text-2xl font-black italic tracking-tighter'>
                {t('cuttingOperations.productBinding.mobileCapture.page.title')}
              </h1>
              <p className='mt-1 text-xs font-bold leading-5 text-muted-foreground'>
                {t('cuttingOperations.productBinding.mobileCapture.page.description')}
              </p>
            </div>
          </div>
        </header>

        <div className='rounded-[28px] border border-dashed border-muted-foreground/20 bg-background p-4 shadow-sm'>
          <TrackingNumberInput
            value={rawCode}
            onValueChange={setRawCode}
            onScanComplete={(value) => {
              void submitCapturedCode(value)
            }}
            placeholder={t('cuttingOperations.productBinding.mobileCapture.page.placeholder')}
            inputClassName='h-14 rounded-2xl border-none bg-muted/50 text-base font-black tracking-[0.08em]'
            autoOpenScanner
          />
        </div>

        {error ? (
          <div className='rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-bold text-destructive'>
            {error}
          </div>
        ) : null}

        <Button
          type='button'
          onClick={() => void submitCapturedCode(rawCode)}
          disabled={submitting}
          className='h-14 w-full rounded-full text-sm font-black tracking-widest'
        >
          {submitting ? <Loader2 className='size-4 animate-spin' /> : <Smartphone className='size-4' />}
          {t('cuttingOperations.productBinding.mobileCapture.page.actions.submit')}
        </Button>
      </section>
    </main>
  )
}

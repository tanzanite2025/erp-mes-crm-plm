import { useMemo } from 'react'
import { useLanguage } from '@/context/language-provider'
import type { ProductBindingFeedbackState } from '../hooks/use-product-binding-page-state'
import type { ProductBindingRecord } from '../services/product-binding-service'

function feedbackToneClass(state: ProductBindingFeedbackState): string {
  if (state === 'success') {
    return 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'
  }
  if (state === 'missingBarcode' || state === 'missingQr') {
    return 'border-amber-500/30 bg-amber-500/5 text-amber-700'
  }
  if (state === 'submitting') {
    return 'border-cyan-500/30 bg-cyan-500/5 text-cyan-700'
  }
  if (state === 'error') {
    return 'border-rose-500/30 bg-rose-500/5 text-rose-700'
  }
  return 'border-border/70 bg-muted/10 text-foreground'
}

type ProductBindingFeedbackCardProps = {
  feedbackState: ProductBindingFeedbackState
  bindingResult: ProductBindingRecord | null
  submitError: string
  productBarcode: string
  prepregQrCode: string
}

export function ProductBindingFeedbackCard(props: ProductBindingFeedbackCardProps) {
  const { t } = useLanguage()
  const { feedbackState, bindingResult, submitError, productBarcode, prepregQrCode } = props

  const feedback = useMemo(() => {
    switch (feedbackState) {
      case 'missingBarcode':
        return {
          title: t('cuttingOperations.productBinding.feedback.missingBarcode.title'),
          description: t('cuttingOperations.productBinding.feedback.missingBarcode.description'),
        }
      case 'missingQr':
        return {
          title: t('cuttingOperations.productBinding.feedback.missingQr.title'),
          description: t('cuttingOperations.productBinding.feedback.missingQr.description'),
        }
      case 'submitting':
        return {
          title: t('cuttingOperations.productBinding.feedback.submitting.title'),
          description: t('cuttingOperations.productBinding.feedback.submitting.description'),
        }
      case 'success':
        return {
          title: t('cuttingOperations.productBinding.feedback.success.title'),
          description:
            bindingResult?.message || t('cuttingOperations.productBinding.feedback.success.description'),
        }
      case 'error':
        return {
          title: t('cuttingOperations.productBinding.feedback.error.title'),
          description: t('cuttingOperations.productBinding.feedback.error.description'),
        }
      default:
        return {
          title: t('cuttingOperations.productBinding.feedback.idle.title'),
          description: t('cuttingOperations.productBinding.feedback.idle.description'),
        }
    }
  }, [bindingResult?.message, feedbackState, t])

  return (
    <div className={`rounded-[24px] border border-dashed p-5 ${feedbackToneClass(feedbackState)}`}>
      <p className='text-sm font-black italic tracking-tighter'>{feedback.title}</p>
      <p className='mt-3 text-[9px] font-black uppercase tracking-widest opacity-80'>
        {feedback.description}
      </p>

      {feedbackState === 'success' ? (
        <div className='mt-5 grid gap-3'>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.barcodeLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>{productBarcode.trim() || '--'}</p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.qrLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>{prepregQrCode.trim() || '--'}</p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.executionLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>
              {bindingResult?.prepregRollInstance?.specCode || bindingResult?.prepregBindingToken || '--'}
            </p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.history.columns.execution')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>
              {bindingResult?.prepregRollInstance?.specName || '--'} / {bindingResult?.prepregRollInstance?.supplierBatchNo || '--'} / {bindingResult?.prepregRollInstance?.boxNo || '--'}
            </p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.tokenLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>{bindingResult?.prepregBindingToken || '--'}</p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.protocolLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>{bindingResult?.barcodeProtocol || '--'}</p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.summaryLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>{bindingResult?.barcodeSummary || '--'}</p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.boundByLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>{bindingResult?.boundBy || '--'}</p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.bindingIdLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>{bindingResult?.id || '--'}</p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.boundAtLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>{bindingResult?.boundAt || '--'}</p>
          </div>
          <div className='rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
            <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
              {t('cuttingOperations.productBinding.feedback.snapshot.statusLabel')}
            </p>
            <p className='mt-2 text-[11px] font-mono leading-5'>{bindingResult?.status || '--'}</p>
          </div>
        </div>
      ) : null}

      {feedbackState === 'error' ? (
        <div className='mt-5 rounded-[20px] border border-dashed border-current/20 bg-background/80 px-4 py-3'>
          <p className='text-[8px] font-black uppercase tracking-[0.16em] opacity-60'>
            {t('cuttingOperations.productBinding.feedback.snapshot.errorLabel')}
          </p>
          <p className='mt-2 text-[11px] font-mono leading-5'>{submitError || '--'}</p>
        </div>
      ) : null}
    </div>
  )
}

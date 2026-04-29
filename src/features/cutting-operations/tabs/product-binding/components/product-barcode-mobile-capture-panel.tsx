import { useEffect, useRef } from 'react'
import { Clipboard, LinkIcon, Loader2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
import type { ProductBarcodeCaptureSession } from '../services/product-barcode-capture-session-service'

type ProductBarcodeMobileCapturePanelProps = {
  captureSession: ProductBarcodeCaptureSession | null
  captureUrl: string
  statusMessage: string
  isCreatingSession: boolean
  onCreateSession: () => void
  onCopyLink: () => void
}

export function ProductBarcodeMobileCapturePanel({
  captureSession,
  captureUrl,
  statusMessage,
  isCreatingSession,
  onCreateSession,
  onCopyLink,
}: ProductBarcodeMobileCapturePanelProps) {
  const { t } = useLanguage()
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!captureUrl || !qrCanvasRef.current) return
    let cancelled = false
    const render = async () => {
      try {
        if (!qrCanvasRef.current || cancelled) return
        await renderBwipBarcode({
          canvas: qrCanvasRef.current,
          code: captureUrl,
          type: 'qrcode',
        })
      } catch {
        return
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [captureUrl])

  return (
    <section className='rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-3.5'>
      <div className='flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-sm font-black italic tracking-tighter text-foreground'>
            <Smartphone className='size-4 text-primary' />
            {t('cuttingOperations.productBinding.mobileCapture.title')}
          </div>
          <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {t('cuttingOperations.productBinding.mobileCapture.description')}
          </p>
          <p className='text-[9px] font-black uppercase tracking-widest text-primary/70'>
            {statusMessage || t('cuttingOperations.productBinding.mobileCapture.status.idle')}
          </p>
        </div>
        <div className='flex shrink-0 flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={onCreateSession}
            disabled={isCreatingSession}
            className='h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
          >
            {isCreatingSession ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Smartphone className='size-4' />
            )}
            {t('cuttingOperations.productBinding.mobileCapture.actions.create')}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={onCopyLink}
            disabled={!captureUrl}
            className='h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
          >
            <Clipboard className='size-4' />
            {t('cuttingOperations.productBinding.mobileCapture.actions.copyLink')}
          </Button>
        </div>
      </div>

      {captureUrl ? (
        <div className='mt-3 grid gap-2 rounded-[20px] border border-dashed border-primary/20 bg-background/80 p-2.5 md:grid-cols-[92px_1fr]'>
          <div className='flex items-center justify-center rounded-xl bg-white p-2'>
            <canvas ref={qrCanvasRef} className='size-[76px]' />
          </div>
          <div className='flex min-w-0 flex-col justify-center gap-1.5'>
            <div className='flex items-center gap-2 text-sm font-black italic tracking-tighter text-foreground'>
              <LinkIcon className='size-4 text-primary' />
              {t('cuttingOperations.productBinding.mobileCapture.link.title')}
            </div>
            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('cuttingOperations.productBinding.mobileCapture.link.description')}
            </p>
            <div className='flex min-w-0 items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-2 text-[11px] font-mono'>
              <LinkIcon className='size-3.5 shrink-0 text-muted-foreground' />
              <span className='truncate'>{captureUrl}</span>
            </div>
            {captureSession ? (
              <div className='flex flex-wrap gap-2 text-[8px] font-mono uppercase tracking-[0.16em] text-muted-foreground'>
                <span>{captureSession.status || '--'}</span>
                <span>{captureSession.sessionId || '--'}</span>
                <span>{captureSession.rawCode || '--'}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

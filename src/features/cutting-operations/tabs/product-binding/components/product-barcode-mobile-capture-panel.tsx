import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  Clipboard,
  LinkIcon,
  Loader2,
  Smartphone,
} from 'lucide-react'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import type { ProductBarcodeCaptureSession } from '../services/product-barcode-capture-session-service'

type ProductBarcodeMobileCapturePanelProps = {
  captureSession: ProductBarcodeCaptureSession | null
  captureUrl: string
  statusMessage: string
  isCreatingSession: boolean
  onCreateSession: () => void
  onCopyLink: () => void
  compact?: boolean
}

export function ProductBarcodeMobileCapturePanel({
  captureSession,
  captureUrl,
  statusMessage,
  isCreatingSession,
  onCreateSession,
  onCopyLink,
  compact = false,
}: ProductBarcodeMobileCapturePanelProps) {
  const { t } = useLanguage()
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isOpen, setIsOpen] = useState(() => !compact || Boolean(captureUrl))

  const handleCreateSession = () => {
    setIsOpen(true)
    onCreateSession()
  }

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
    <section
      className={
        compact
          ? 'rounded-[20px] border border-dashed border-primary/20 bg-background/80 p-3'
          : 'rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-3.5'
      }
    >
      <div
        className={
          compact
            ? 'flex min-w-0 flex-col gap-3'
            : 'flex min-w-0 flex-col gap-2.5 md:flex-row md:items-start md:justify-between'
        }
      >
        <div className='min-w-0 flex-1 space-y-1'>
          <div className='flex min-w-0 items-center gap-2 text-sm font-black tracking-tight text-foreground italic'>
            <Smartphone className='size-4 text-primary' />
            <span className='min-w-0 break-words'>
              {t('cuttingOperations.productBinding.mobileCapture.title')}
            </span>
          </div>
          <p className='text-xs leading-5 font-medium text-muted-foreground'>
            {t('cuttingOperations.productBinding.mobileCapture.description')}
          </p>
          <p className='text-xs leading-5 font-semibold text-primary/80'>
            {statusMessage ||
              t('cuttingOperations.productBinding.mobileCapture.status.idle')}
          </p>
        </div>
        <div
          className={
            compact
              ? 'flex w-full shrink-0 flex-wrap items-center gap-2'
              : 'flex shrink-0 flex-wrap items-center gap-2'
          }
        >
          <Button
            type='button'
            variant='outline'
            onClick={handleCreateSession}
            disabled={isCreatingSession}
            className={
              compact
                ? 'h-9 rounded-full px-3 text-xs font-semibold tracking-normal'
                : 'h-9 rounded-full px-4 text-xs font-semibold tracking-normal'
            }
          >
            {isCreatingSession ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Smartphone className='size-4' />
            )}
            {t('cuttingOperations.productBinding.mobileCapture.actions.create')}
          </Button>
          {captureUrl ? (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => setIsOpen((current) => !current)}
              aria-expanded={isOpen}
              aria-controls='product-binding-mobile-capture-details'
              aria-label={t(
                isOpen
                  ? 'cuttingOperations.productBinding.mobileCapture.actions.collapse'
                  : 'cuttingOperations.productBinding.mobileCapture.actions.expand'
              )}
              title={t(
                isOpen
                  ? 'cuttingOperations.productBinding.mobileCapture.actions.collapse'
                  : 'cuttingOperations.productBinding.mobileCapture.actions.expand'
              )}
              className='size-9 rounded-full'
            >
              <ChevronDown
                className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          ) : null}
        </div>
      </div>

      {isOpen && captureUrl ? (
        <div
          id='product-binding-mobile-capture-details'
          className={
            compact
              ? 'mt-1 grid min-w-0 gap-3 rounded-[18px] border border-dashed border-primary/20 bg-muted/30 p-3 sm:grid-cols-[80px_minmax(0,1fr)]'
              : 'mt-3 grid min-w-0 gap-3 rounded-[20px] border border-dashed border-primary/20 bg-background/80 p-2.5 md:grid-cols-[92px_minmax(0,1fr)]'
          }
        >
          <div className='flex min-w-0 items-center justify-center rounded-xl bg-white p-2'>
            <canvas
              ref={qrCanvasRef}
              className={compact ? 'size-[64px]' : 'size-[76px]'}
            />
          </div>
          <div className='flex min-w-0 flex-col justify-center gap-1.5'>
            <div className='flex min-w-0 items-center gap-2 text-sm font-black tracking-tight text-foreground italic'>
              <LinkIcon className='size-4 text-primary' />
              <span className='min-w-0 break-words'>
                {t('cuttingOperations.productBinding.mobileCapture.link.title')}
              </span>
            </div>
            <p className='text-xs leading-5 font-medium text-muted-foreground'>
              {t(
                'cuttingOperations.productBinding.mobileCapture.link.description'
              )}
            </p>
            <Button
              type='button'
              variant='outline'
              onClick={onCopyLink}
              className='h-9 w-fit rounded-full px-3 text-xs font-semibold tracking-normal'
            >
              <Clipboard className='size-4' />
              {t(
                'cuttingOperations.productBinding.mobileCapture.actions.copyLink'
              )}
            </Button>
            <div className='flex min-w-0 items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-2 font-mono text-[11px]'>
              <LinkIcon className='size-3.5 shrink-0 text-muted-foreground' />
              <span className='min-w-0 truncate'>{captureUrl}</span>
            </div>
            {captureSession ? (
              <div className='flex flex-wrap gap-2 text-xs leading-4 text-muted-foreground'>
                <span className='rounded-full bg-muted/60 px-2 py-1 font-semibold'>
                  {captureSession.status || '--'}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

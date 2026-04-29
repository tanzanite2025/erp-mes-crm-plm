import { useEffect, useRef } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { renderBwipBarcode } from '@/lib/bwip-renderer'

type HistoryQrCodeCellProps = {
  code: string
  isLatest: boolean
  latestLabel: string
}

export function HistoryQrCodeCell(props: HistoryQrCodeCellProps) {
  const { code, isLatest, latestLabel } = props
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!code || !canvasRef.current) return

    let cancelled = false
    const render = async () => {
      try {
        if (!canvasRef.current || cancelled) return
        await renderBwipBarcode({
          canvas: canvasRef.current,
          code,
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
  }, [code])

  if (!code) {
    return (
      <div className='flex flex-col items-center gap-2'>
        <div className='flex size-[68px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 text-[11px] font-mono text-muted-foreground'>
          --
        </div>
        {isLatest ? (
          <span className='inline-flex h-5 w-fit items-center rounded-full bg-emerald-500/10 px-2 text-[8px] font-mono uppercase tracking-[0.16em] text-emerald-700'>
            {latestLabel}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center gap-2'>
      <div
        className='rounded-2xl border border-dashed border-border/60 bg-white p-1.5 shadow-none'
        title={code}
      >
        <canvas ref={canvasRef} className='size-[68px]' />
      </div>
      {isLatest ? (
        <span className='inline-flex h-5 w-fit items-center rounded-full bg-emerald-500/10 px-2 text-[8px] font-mono uppercase tracking-[0.16em] text-emerald-700'>
          {latestLabel}
        </span>
      ) : null}
    </div>
  )
}

type HistoryProductBarcodeCellProps = {
  productBarcode: string
}

export function HistoryProductBarcodeCell(props: HistoryProductBarcodeCellProps) {
  const { productBarcode } = props
  const { t } = useLanguage()

  const handleCopyProductBarcode = async () => {
    if (!productBarcode) return

    try {
      await navigator.clipboard.writeText(productBarcode)
      toast.success(t('cuttingOperations.productBinding.history.toasts.productBarcodeCopied'))
    } catch {
      toast.error(t('cuttingOperations.productBinding.history.toasts.copyFailed'))
    }
  }

  return (
    <div className='flex items-center gap-2'>
      <span className='min-w-0 flex-1 truncate text-[11px] font-mono text-foreground'>
        {productBarcode || '--'}
      </span>
      {productBarcode ? (
        <button
          type='button'
          onClick={() => void handleCopyProductBarcode()}
          className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border/60 bg-background text-muted-foreground transition-colors hover:text-foreground'
          title={t('cuttingOperations.productBinding.history.actions.copyProductBarcode')}
        >
          <Copy className='size-3.5' />
        </button>
      ) : null}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import {
  renderProductCodeLinearBarcodeAndQrCodeImages,
  type ProductCodeLinearBarcodeAndQrCodeImages,
} from '@/lib/product-code-linear-barcode-and-qr-code-renderer'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'

interface ProductCodeLinearBarcodeAndQrCodePreviewProps {
  code: string
  compact?: boolean
  className?: string
}

export function ProductCodeLinearBarcodeAndQrCodePreview({
  code,
  compact = false,
  className,
}: ProductCodeLinearBarcodeAndQrCodePreviewProps) {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderedCode, setRenderedCode] = useState<{
    code: string
    images?: ProductCodeLinearBarcodeAndQrCodeImages
    failed?: boolean
  }>()
  const currentRender = renderedCode?.code === code ? renderedCode : undefined

  useEffect(() => {
    let cancelled = false
    const renderVisibleProductCodeSymbols = async () => {
      try {
        const images = await renderProductCodeLinearBarcodeAndQrCodeImages(code)
        if (!cancelled) setRenderedCode({ code, images })
      } catch {
        if (!cancelled) setRenderedCode({ code, failed: true })
      }
    }

    // Inventory can contain hundreds of rows; create images only as they enter view.
    if (typeof IntersectionObserver === 'undefined') {
      void renderVisibleProductCodeSymbols()
      return () => {
        cancelled = true
      }
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      void renderVisibleProductCodeSymbols()
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [code])

  return (
    <div
      ref={containerRef}
      role='group'
      aria-label={t('codeCenter.linearBarcode.symbols.sameCode', { code })}
      aria-busy={!currentRender}
      className={cn(
        'grid items-center gap-3 rounded-lg bg-white p-2 text-slate-900',
        compact
          ? 'w-[220px] grid-cols-[1fr_48px]'
          : 'grid-cols-[minmax(0,1fr)_88px]',
        className
      )}
    >
      <div className='min-w-0 space-y-1 text-center'>
        <div className='text-[10px] font-bold'>
          {t('codeCenter.linearBarcode.symbols.linearBarcode')}
        </div>
        <div
          className={cn(
            'flex items-center justify-center',
            compact ? 'h-12' : 'h-[88px]'
          )}
        >
          {currentRender?.images ? (
            <img
              src={currentRender.images.linearBarcodeDataUrl}
              alt={`${t('codeCenter.linearBarcode.symbols.linearBarcode')} ${code}`}
              className='h-full w-full object-contain [image-rendering:pixelated]'
            />
          ) : (
            <span className='text-[10px] text-slate-500'>
              {t(
                currentRender?.failed
                  ? 'codeCenter.linearBarcode.symbols.renderFailed'
                  : 'codeCenter.linearBarcode.symbols.loading'
              )}
            </span>
          )}
        </div>
      </div>
      <div className='space-y-1 text-center'>
        <div className='text-[10px] font-bold'>
          {t('codeCenter.linearBarcode.symbols.qrCode')}
        </div>
        {currentRender?.images ? (
          <img
            src={currentRender.images.qrCodeDataUrl}
            alt={`${t('codeCenter.linearBarcode.symbols.qrCode')} ${code}`}
            className={cn(
              'object-contain [image-rendering:pixelated]',
              compact ? 'size-12' : 'size-[88px]'
            )}
          />
        ) : (
          <div
            className={cn('bg-slate-50', compact ? 'size-12' : 'size-[88px]')}
          />
        )}
      </div>
    </div>
  )
}

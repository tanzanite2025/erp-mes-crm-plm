'use client'

import { useEffect, useRef } from 'react'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'

const logger = createLogger('BarcodePreview')

interface BarcodePreviewProps {
  code: string
  shortCode?: string
  type?: 'qrcode' | 'code128'
  isDrainHole?: boolean
  wheelType?: string
  scopeCode?: string
  className?: string
  headerLabel?: string
  statusLabel?: string
}

export function BarcodePreview({
  code,
  shortCode,
  type = 'qrcode',
  isDrainHole = false,
  wheelType = 'H',
  scopeCode = '',
  className = '',
  headerLabel,
  statusLabel,
}: BarcodePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isLinearBarcode = type === 'code128'

  useEffect(() => {
    if (!canvasRef.current || !code) return

    let cancelled = false

    const renderBarcode = async () => {
      try {
        if (cancelled || !canvasRef.current) return

        await renderBwipBarcode({
          canvas: canvasRef.current,
          code,
          type,
        })
      } catch (error) {
        logger.error(`${type} render failed`, error)
      }
    }

    void renderBarcode()

    return () => {
      cancelled = true
    }
  }, [code, type])

  const parts = []
  if (wheelType) parts.push(wheelType)
  if (scopeCode) parts.push(scopeCode.trim().toUpperCase())
  const finalSuffix = parts.join('-')

  return (
    <div
      className={cn(
        'relative flex h-auto w-full max-w-[560px] flex-col items-center gap-4 overflow-hidden rounded-2xl p-6 shadow-2xl backdrop-blur-xl transition-all duration-500 sm:flex-row sm:items-stretch sm:gap-6',
        'border-white/50 bg-white/40',
        'dark:border-white/10 dark:bg-slate-900/60',
        className
      )}
    >
      <div className='pointer-events-none absolute top-0 right-0 h-32 w-32 bg-blue-500/10 blur-[50px]' />

      <div
        className={cn(
          'relative z-20 flex shrink-0 items-center justify-center rounded-xl bg-white p-2.5 shadow-lg ring-4 ring-white/5',
          isLinearBarcode ? 'h-[88px] w-[176px]' : 'h-[100px] w-[100px]'
        )}
      >
        <canvas
          ref={canvasRef}
          className='block h-full w-full bg-white'
          style={{
            imageRendering: 'pixelated',
            aspectRatio: isLinearBarcode ? '3 / 1' : '1 / 1',
          }}
        />
      </div>

      <div className='z-10 flex min-w-0 flex-1 flex-col items-center justify-center text-center sm:min-w-[260px] sm:items-start sm:text-left'>
        {headerLabel ? (
          <div className='mb-1 text-[10px] font-black tracking-widest text-blue-600/60 uppercase dark:text-blue-400/60'>
            {headerLabel}
          </div>
        ) : null}
        <div
          className='pointer-events-none flex max-w-full flex-wrap items-center gap-1.5 font-mono text-base font-black tracking-[0.2em] drop-shadow-sm select-none sm:text-lg'
          style={{ WebkitTouchCallout: 'none' }}
        >
          {isDrainHole ? <span className='text-red-500'>H</span> : null}
          <span className='min-w-0 break-all text-slate-900 dark:text-white'>
            {shortCode || '--------------'}
          </span>
          {finalSuffix ? (
            <span className='ml-2 inline-flex items-center rounded-sm border-2 border-red-500 px-1.5 py-0.5 text-xs leading-none font-black text-red-500 italic'>
              {finalSuffix}
            </span>
          ) : null}
        </div>
        {statusLabel ? (
          <div className='mt-2 flex gap-1.5'>
            <span className='rounded border border-blue-500/10 bg-blue-500/10 px-1.5 py-0.5 text-[7px] font-black tracking-tighter text-blue-600 uppercase dark:text-blue-400'>
              {statusLabel}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { createLogger } from '@/lib/logger'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
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
        'relative p-6 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-6 overflow-hidden w-full max-w-[560px] h-auto backdrop-blur-xl transition-all duration-500',
        'bg-white/40 border-white/50',
        'dark:bg-slate-900/60 dark:border-white/10',
        className
      )}
    >
      <div className='absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] pointer-events-none' />

      <div
        className={cn(
          'relative z-20 shrink-0 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-lg ring-4 ring-white/5',
          isLinearBarcode ? 'w-[176px] h-[88px]' : 'w-[100px] h-[100px]'
        )}
      >
        <canvas
          ref={canvasRef}
          className='block w-full h-full bg-white'
          style={{
            imageRendering: 'pixelated',
            aspectRatio: isLinearBarcode ? '3 / 1' : '1 / 1',
          }}
        />
      </div>

      <div className='flex-1 flex flex-col justify-center items-center sm:items-start min-w-0 z-10 text-center sm:text-left sm:min-w-[260px]'>
        {headerLabel ? (
          <div className='text-[10px] font-black text-blue-600/60 dark:text-blue-400/60 uppercase tracking-widest mb-1'>
            {headerLabel}
          </div>
        ) : null}
        <div
          className='flex max-w-full flex-wrap items-center gap-1.5 text-base sm:text-lg font-mono font-black tracking-[0.2em] drop-shadow-sm select-none pointer-events-none'
          style={{ WebkitTouchCallout: 'none' }}
        >
          {isDrainHole ? <span className='text-red-500'>H</span> : null}
          <span className='min-w-0 break-all text-slate-900 dark:text-white'>{shortCode || '--------------'}</span>
          {finalSuffix ? (
            <span className='ml-2 px-1.5 py-0.5 border-2 border-red-500 text-red-500 text-xs leading-none inline-flex items-center rounded-sm font-black italic'>
              {finalSuffix}
            </span>
          ) : null}
        </div>
        {statusLabel ? (
          <div className='mt-2 flex gap-1.5'>
            <span className='text-[7px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/10 uppercase tracking-tighter'>
              {statusLabel}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

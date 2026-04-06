'use client'

import { useEffect, useRef } from 'react'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { loadBwipJs } from '@/lib/lazy-vendors'

import { useLanguage } from '@/context/language-provider'
import type { TranslationKey } from '@/locales'

const logger = createLogger('DMPreview')

interface DMPreviewProps {
    code: string
    shortCode?: string
    type?: 'datamatrix' | 'qrcode' | 'code128'
    isDrainHole?: boolean
    wheelType?: string
    scopeCode?: string
    className?: string
}

export function DMPreview({
    code,
    shortCode,
    type = 'datamatrix',
    isDrainHole = false,
    wheelType = 'H',
    scopeCode = '',
    className = '',
}: DMPreviewProps) {
    const { t } = useLanguage()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isLinearBarcode = type === 'code128'
    const barcodeId = type === 'qrcode' ? 'qrcode' : type === 'code128' ? 'code128' : 'datamatrix'

    useEffect(() => {
        if (!canvasRef.current || !code) return

        let cancelled = false

        const renderBarcode = async () => {
            try {
                const bwipjs = await loadBwipJs()

                if (cancelled || !canvasRef.current) return

                const barcodeOptions: Parameters<typeof bwipjs.toCanvas>[1] = {
                    bcid: barcodeId,
                    text: code,
                    scale: isLinearBarcode ? 3 : 10,
                    includetext: false,
                    backgroundcolor: 'ffffff',
                    barcolor: '000000',
                    textencoding: 'utf8',
                }

                if (isLinearBarcode) {
                    barcodeOptions.height = 18
                    barcodeOptions.paddingwidth = 6
                    barcodeOptions.paddingheight = 4
                }

                if (type === 'qrcode') {
                    barcodeOptions.eclevel = 'L'
                }

                bwipjs.toCanvas(canvasRef.current, barcodeOptions)
            } catch (error) {
                logger.error(`${type} render failed`, error)
            }
        }

        void renderBarcode()

        return () => {
            cancelled = true
        }
    }, [barcodeId, code, isLinearBarcode, type])

    return (
        <div className={cn(
            'relative p-6 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center sm:items-stretch gap-5 sm:gap-8 overflow-hidden w-full max-w-[500px] h-auto backdrop-blur-xl transition-all duration-500',
            'bg-white/40 border-white/50',
            'dark:bg-slate-900/60 dark:border-white/10',
            className,
        )}>
            <div className='absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] pointer-events-none' />

            <div
                className={cn(
                    'relative z-20 shrink-0 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-lg ring-4 ring-white/5',
                    isLinearBarcode ? 'w-[220px] h-[96px]' : 'w-[100px] h-[100px]',
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

            <div className='flex-1 flex flex-col justify-center items-center sm:items-start min-w-0 z-10 text-center sm:text-left'>
                <div className='text-[10px] font-black text-blue-600/60 dark:text-blue-400/60 uppercase tracking-widest mb-1'>
                    {t('basicSettings.dmNumbering.simulation.batchSN' as TranslationKey)}
                </div>
                <div
                    className='flex items-center gap-1.5 text-lg sm:text-xl font-mono font-black tracking-widest drop-shadow-sm select-none pointer-events-none'
                    style={{ WebkitTouchCallout: 'none' }}
                >
                    {isDrainHole && <span className='text-red-500'>H</span>}
                    <span className='text-slate-900 dark:text-white'>
                        {shortCode || '--------------'}
                    </span>
                    {(() => {
                        const parts = []
                        if (wheelType) parts.push(wheelType)
                        if (scopeCode) parts.push(scopeCode.trim().toUpperCase())
                        const finalSuffix = parts.join('-')
                        if (!finalSuffix) return null
                        return (
                            <span className='ml-2 px-1.5 py-0.5 border-2 border-red-500 text-red-500 text-xs leading-none inline-flex items-center rounded-sm font-black italic'>
                                {finalSuffix}
                            </span>
                        )
                    })()}
                </div>
                <div className='mt-2 flex gap-1.5'>
                    <span className='text-[7px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/10 uppercase tracking-tighter'>
                        {t('basicSettings.dmNumbering.simulation.verifiedStandard' as TranslationKey)}
                    </span>
                    <span className='text-[7px] font-black bg-slate-200/50 dark:bg-white/5 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5 uppercase tracking-tighter'>XDFC-OS 1.0</span>
                </div>
            </div>
        </div>
    )
}

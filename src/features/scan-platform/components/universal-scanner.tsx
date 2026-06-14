'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Scan, RefreshCw, X, Check, Cpu, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import type { AnyScanPluginDefinition } from '../core/plugin-contract'
import type { ScanResolvedContext, ScanSubmitResult } from '../core/types'

const logger = createLogger('UniversalScanner')

interface UniversalScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plugin: AnyScanPluginDefinition
  onSuccess?: (result: ScanSubmitResult) => void
  hostContext?: unknown
}

export function UniversalScanner({
  open,
  onOpenChange,
  plugin,
  onSuccess,
  hostContext,
}: UniversalScannerProps) {
  const [isResolving, setIsResolving] = useState(false)
  const [resolvedContext, setResolvedContext] =
    useState<ScanResolvedContext | null>(null)
  const [scannedCode, setScannedCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[500px] rounded-[32px] overflow-hidden border-none',
    header: 'p-6 pb-2 border-none bg-muted/5',
    title:
      'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[9px] font-black uppercase tracking-[0.2em] opacity-50',
    body: 'p-6 space-y-6',
    footer:
      'p-6 pt-2 flex items-center justify-between border-t border-dashed border-muted/20 bg-muted/2',
  })

  // 自动聚焦
  useEffect(() => {
    if (open && !resolvedContext) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, resolvedContext])

  const handleResolve = async (code: string) => {
    if (!code) return
    setIsResolving(true)
    try {
      const context = await plugin.resolveScan({
        rawCode: code,
        source: 'hardware',
        surface: 'embedded-dialog',
        context: hostContext,
      })
      setResolvedContext(context)
      setScannedCode('')
    } catch (error) {
      logger.error('扫码解析引擎异常', error)
      toast.error(`[RESOLVER_FAIL] ${plugin.name} 无法解析此条码`)
      setScannedCode('')
    } finally {
      setIsResolving(false)
    }
  }

  const handleSubmit = async () => {
    if (!resolvedContext || !plugin.submitAction) return
    setIsResolving(true)
    try {
      const result = await plugin.submitAction(resolvedContext)
      if (result.success) {
        toast.success(`[SDRTS_SYNC] ${result.message}`)
        onSuccess?.(result)
        onOpenChange(false)
      } else {
        toast.error(`[SYNC_ERROR] ${result.message}`)
      }
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <div className='rounded-xl bg-primary/10 p-2'>
            <Cpu className='size-5 animate-pulse text-primary' />
          </div>
          {plugin.name} / SCANNER_SHELL
        </>
      }
      description={`ENGINE_CODE: ${plugin.code} / ${plugin.description}`}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <div className='flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1'>
            <Zap className='size-3 text-primary' />
            <span className='text-[8px] font-black tracking-widest text-primary/60 uppercase'>
              Core_V1_SDRTS_Active
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='h-9 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            >
              退出 / EXIT
            </Button>
            {resolvedContext && (
              <Button
                onClick={handleSubmit}
                disabled={isResolving}
                className='h-9 rounded-full bg-primary px-8 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95'
              >
                {isResolving ? (
                  <RefreshCw className='size-3 animate-spin' />
                ) : (
                  <Check className='mr-2 size-3' />
                )}
                确认同步 / COMMIT_SDRTS
              </Button>
            )}
          </div>
        </>
      }
    >
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />

      {!resolvedContext ? (
        <div className='space-y-6 py-6'>
          <div className='group relative'>
            <Scan className='absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-primary' />
            <Input
              ref={inputRef}
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResolve(scannedCode)}
              placeholder='WAITING_FOR_SERIAL / 等待物料扫码'
              className='h-14 rounded-2xl border-none bg-muted/30 pl-12 text-sm font-black tracking-widest uppercase shadow-inner focus-visible:ring-primary/20'
            />
          </div>
          <div className='flex flex-col items-center justify-center rounded-[24px] border border-dashed border-muted-foreground/10 bg-muted/5 p-12 opacity-40'>
            <RefreshCw
              className={cn('mb-4 size-12', isResolving && 'animate-spin')}
            />
            <p className='text-[10px] font-black tracking-widest uppercase italic'>
              Scanning_Protocol_Ready
            </p>
          </div>
        </div>
      ) : (
        <div className='relative animate-in space-y-6 duration-300 zoom-in-95'>
          <div className='rounded-[28px] border border-dashed border-emerald-500/20 bg-emerald-500/5 p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <Badge className='border-none bg-emerald-500/10 px-3 font-mono font-black text-emerald-600 italic'>
                RESOLVED_MATCH
              </Badge>
              <div
                onClick={() => setResolvedContext(null)}
                className='cursor-pointer rounded-full p-1.5 text-destructive opacity-40 transition-colors hover:bg-destructive/10'
              >
                <X className='size-4' />
              </div>
            </div>
            <div className='space-y-2'>
              <p className='text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
                物料代码 / MATERIAL_ID
              </p>
              <p className='text-sm font-black italic'>
                {resolvedContext.rawCode}
              </p>
            </div>
          </div>

          <div className='rounded-[28px] border border-dashed border-muted-foreground/10 bg-muted/10 p-6'>
            <p className='mb-2 text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-50'>
              解析有效载荷 / PAYLOAD_BUFFER
            </p>
            <pre className='custom-scrollbar max-h-32 overflow-y-auto font-mono text-[9px] leading-relaxed font-bold text-primary/70'>
              {JSON.stringify(resolvedContext.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </ActionDialogShell>
  )
}

function Badge({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-black',
        className
      )}
    >
      {children}
    </div>
  )
}

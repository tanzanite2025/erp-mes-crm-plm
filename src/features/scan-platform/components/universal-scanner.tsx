'use client'

import { useState, useRef, useEffect } from 'react'
import { Scan, RefreshCw, X, Check, Cpu, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AnyScanPluginDefinition } from '../core/plugin-contract'
import type { ScanResolvedContext, ScanSubmitResult } from '../core/types'

interface UniversalScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plugin: AnyScanPluginDefinition
  onSuccess?: (result: ScanSubmitResult) => void
  hostContext?: any
}

export function UniversalScanner({
  open,
  onOpenChange,
  plugin,
  onSuccess,
  hostContext,
}: UniversalScannerProps) {
  const [isResolving, setIsResolving] = useState(false)
  const [resolvedContext, setResolvedContext] = useState<ScanResolvedContext | null>(null)
  const [scannedCode, setScannedCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[500px] rounded-[32px] overflow-hidden border-none',
    header: 'p-6 pb-2 border-none bg-muted/5',
    title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[9px] font-black uppercase tracking-[0.2em] opacity-50',
    body: 'p-6 space-y-6',
    footer: 'p-6 pt-2 flex items-center justify-between border-t border-dashed border-muted/20 bg-muted/2',
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
        context: hostContext
      })
      setResolvedContext(context)
      setScannedCode('')
    } catch (error) {
      console.error('[CRITICAL] 扫码解析引擎异常:', error)
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
      title={(
        <>
          <div className='p-2 bg-primary/10 rounded-xl'>
            <Cpu className='size-5 text-primary animate-pulse' />
          </div>
          {plugin.name} / SCANNER_SHELL
        </>
      )}
      description={`ENGINE_CODE: ${plugin.code} / ${plugin.description}`}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10'>
            <Zap className='size-3 text-primary' />
            <span className='text-[8px] font-black text-primary/60 uppercase tracking-widest'>Core_V1_SDRTS_Active</span>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' onClick={() => onOpenChange(false)} className='h-9 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'>
              退出 / EXIT
            </Button>
            {resolvedContext && (
               <Button 
                onClick={handleSubmit}
                disabled={isResolving}
                className='h-9 rounded-full px-8 bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95'
               >
                 {isResolving ? <RefreshCw className='size-3 animate-spin' /> : <Check className='size-3 mr-2' />}
                 确认同步 / COMMIT_SDRTS
               </Button>
            )}
          </div>
        </>
      )}
    >
      <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />

      {!resolvedContext ? (
        <div className='space-y-6 py-6'>
          <div className='relative group'>
            <Scan className='absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors' />
            <Input 
              ref={inputRef}
              value={scannedCode}
              onChange={e => setScannedCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResolve(scannedCode)}
              placeholder='WAITING_FOR_SERIAL / 等待物料扫码'
              className='h-14 pl-12 rounded-2xl border-none bg-muted/30 shadow-inner font-black text-sm tracking-widest uppercase focus-visible:ring-primary/20'
            />
          </div>
          <div className='flex flex-col items-center justify-center p-12 rounded-[24px] border border-dashed border-muted-foreground/10 bg-muted/5 opacity-40'>
              <RefreshCw className={cn('size-12 mb-4', isResolving && 'animate-spin')} />
              <p className='text-[10px] font-black uppercase tracking-widest italic'>Scanning_Protocol_Ready</p>
          </div>
        </div>
      ) : (
        <div className='space-y-6 animate-in zoom-in-95 duration-300 relative'>
          <div className='p-6 rounded-[28px] bg-emerald-500/5 border border-dashed border-emerald-500/20'>
             <div className='flex items-center justify-between mb-4'>
                <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 border-none px-3 font-mono font-black italic'>RESOLVED_MATCH</Badge>
                <div onClick={() => setResolvedContext(null)} className='cursor-pointer p-1.5 hover:bg-destructive/10 rounded-full transition-colors text-destructive opacity-40'>
                   <X className='size-4' />
                </div>
             </div>
             <div className='space-y-2'>
                <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest'>物料代码 / MATERIAL_ID</p>
                <p className='text-sm font-black italic'>{resolvedContext.rawCode}</p>
             </div>
          </div>

          <div className='p-6 rounded-[28px] bg-muted/10 border border-dashed border-muted-foreground/10'>
              <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2 opacity-50'>解析有效载荷 / PAYLOAD_BUFFER</p>
              <pre className='text-[9px] font-mono font-bold text-primary/70 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar'>
                {JSON.stringify(resolvedContext.payload, null, 2)}
              </pre>
          </div>
        </div>
      )}
    </ActionDialogShell>
  )
}

function Badge({ children, className }: any) {
  return (
    <div className={cn('inline-flex items-center text-[10px] h-6 px-2.5 rounded-full font-black border', className)}>
      {children}
    </div>
  )
}

'use client'

import { AlertCircle, ArrowRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeltaPreviewProps {
  delta?: any
  className?: string
}

/**
 * SDRTS 差量预览器 (Delta Previewer)
 * 专门用于解析并可视化展示 [旧值 -> 新值] 的补丁变化。
 */
export function DeltaPreview({ delta, className }: DeltaPreviewProps) {
  if (!delta || typeof delta !== 'object' || Object.keys(delta).length === 0) {
    return (
      <div className='flex items-center gap-2 p-4 rounded-xl border border-dashed border-muted-foreground/10 bg-muted/5 opacity-50'>
        <AlertCircle className='size-3.5' />
        <span className='text-[10px] font-black uppercase tracking-widest'>无差量快照 / NO_DELTA_SNAPSHOT</span>
      </div>
    )
  }

  const renderValue = (val: any) => {
    if (val === null) return <span className='opacity-30 italic'>null</span>
    if (val === undefined) return <span className='opacity-30 italic'>undefined</span>
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  return (
    <div className={cn('space-y-2 rounded-2xl bg-muted/5 p-4 border border-dashed border-muted-foreground/5', className)}>
      <div className='flex items-center gap-2 mb-3 border-b border-dashed border-muted-foreground/10 pb-2'>
        <Layers className='size-3.5 text-primary/60' />
        <span className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground'>
          审计差量视图 / AUDIT_DELTA_VIEW
        </span>
      </div>

      <div className='space-y-1.5'>
        {Object.entries(delta).map(([path, change]: [string, any]) => {
          // SDRTS 载荷标准: { o: old, n: new }
          const hasChange = change && typeof change === 'object' && ('o' in change || 'n' in change)
          
          return (
            <div key={path} className='flex flex-col gap-1 p-2 rounded-lg hover:bg-background/50 transition-colors'>
              <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{path}</div>
              <div className='flex items-center gap-3 font-mono text-[11px] font-bold'>
                {hasChange ? (
                  <>
                    <span className='text-rose-500/80 line-through decoration-rose-500/30'>{renderValue(change.o)}</span>
                    <ArrowRight className='size-3 text-muted-foreground/30' />
                    <span className='text-emerald-600'>{renderValue(change.n)}</span>
                  </>
                ) : (
                  <span className='text-muted-foreground/60'>{renderValue(change)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

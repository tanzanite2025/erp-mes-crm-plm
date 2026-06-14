'use client'

import { AlertCircle, ArrowRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeltaPreviewProps {
  delta?: unknown
  className?: string
}

interface DeltaChange {
  o?: unknown
  n?: unknown
}

function isDeltaChange(value: unknown): value is DeltaChange {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('o' in value || 'n' in value)
  )
}

function isDeltaRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * SDRTS 差量预览器 (Delta Previewer)
 * 专门用于解析并可视化展示 [旧值 -> 新值] 的补丁变化。
 */
export function DeltaPreview({ delta, className }: DeltaPreviewProps) {
  if (!isDeltaRecord(delta) || Object.keys(delta).length === 0) {
    return (
      <div className='flex items-center gap-2 rounded-xl border border-dashed border-muted-foreground/10 bg-muted/5 p-4 opacity-50'>
        <AlertCircle className='size-3.5' />
        <span className='text-[10px] font-black tracking-widest uppercase'>
          无差量快照 / NO_DELTA_SNAPSHOT
        </span>
      </div>
    )
  }

  const renderValue = (val: unknown) => {
    if (val === null) return <span className='italic opacity-30'>null</span>
    if (val === undefined)
      return <span className='italic opacity-30'>undefined</span>
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  return (
    <div
      className={cn(
        'space-y-2 rounded-2xl border border-dashed border-muted-foreground/5 bg-muted/5 p-4',
        className
      )}
    >
      <div className='mb-3 flex items-center gap-2 border-b border-dashed border-muted-foreground/10 pb-2'>
        <Layers className='size-3.5 text-primary/60' />
        <span className='text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
          审批差量视图 / APPROVAL_DELTA_VIEW
        </span>
      </div>

      <div className='space-y-1.5'>
        {Object.entries(delta).map(([path, change]) => {
          // SDRTS 载荷标准: { o: old, n: new }
          const hasChange = isDeltaChange(change)

          return (
            <div
              key={path}
              className='flex flex-col gap-1 rounded-lg p-2 transition-colors hover:bg-background/50'
            >
              <div className='text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {path}
              </div>
              <div className='flex items-center gap-3 font-mono text-[11px] font-bold'>
                {hasChange ? (
                  <>
                    <span className='text-rose-500/80 line-through decoration-rose-500/30'>
                      {renderValue(change.o)}
                    </span>
                    <ArrowRight className='size-3 text-muted-foreground/30' />
                    <span className='text-emerald-600'>
                      {renderValue(change.n)}
                    </span>
                  </>
                ) : (
                  <span className='text-muted-foreground/60'>
                    {renderValue(change)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

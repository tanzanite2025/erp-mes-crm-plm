import { useState } from 'react'
import { History } from 'lucide-react'
import { auditUtils } from '@/lib/audit-utils'
import { cn } from '@/lib/utils'
import { DataTimeline } from '@/features/audit-timeline/components/data-timeline'
import { type AuditModuleValue } from '@/features/audit-timeline/data/audit-modules'

interface AuditStampProps {
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
  className?: string
  module?: AuditModuleValue
  targetId?: string
  showTimelineButton?: boolean
}

/**
 * AuditStamp - XDFC 标准化审计信息展示组件
 * 遵循 UDS 1.0 元数据规范 (Mono Font + Text-8px)
 * 保证操作员名称脱敏且视觉风格统一
 */
export function AuditStamp({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  className,
  module,
  targetId,
  showTimelineButton = true,
}: AuditStampProps) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  // 仅当传入了 module 和 targetId 时才启用可交互模式
  const isInteractive = !!(module && targetId)
  // 安全清洗日期格式，防止原始数据不规范导致 UI 异常
  const formattedCreatedAt = createdAt
    ? createdAt.replace('T', ' ').split('.')[0]
    : '-'
  const formattedUpdatedAt = updatedAt
    ? updatedAt.replace('T', ' ').split('.')[0]
    : null

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 border-l border-dashed border-muted-foreground/20 pl-4 transition-all duration-300',
        'group/audit font-mono text-[9px] tracking-tighter uppercase opacity-50 hover:opacity-100',
        isInteractive && 'hover:border-primary/50',
        className
      )}
    >
      {/* Created Trace */}
      <div className='flex items-center gap-2'>
        <span className='font-black text-primary/60'>CREATED:</span>
        <span className='font-medium text-foreground/80'>
          {formattedCreatedAt}
        </span>
        <div className='size-0.5 rounded-full bg-muted-foreground/30' />
        <span className='font-black text-slate-500 italic'>
          @{auditUtils.formatOperatorName(createdBy)}
        </span>
        {isInteractive && showTimelineButton && (
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation()
              setIsTimelineOpen(true)
            }}
            className='ms-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/20 bg-primary/8 text-primary transition-colors hover:bg-primary/15'
            aria-label='Open data timeline'
          >
            <History className='size-3' />
          </button>
        )}
      </div>

      {/* Updated Trace (Only if exists and different from creation) */}
      {formattedUpdatedAt && updatedAt !== createdAt && (
        <div className='flex animate-in items-center gap-2 fade-in slide-in-from-left-1'>
          <span className='font-black text-amber-600/60'>UPDATED:</span>
          <span className='font-medium text-foreground/80'>
            {formattedUpdatedAt}
          </span>
          <div className='size-0.5 rounded-full bg-muted-foreground/30' />
          <span className='font-black text-slate-500 italic'>
            @{auditUtils.formatOperatorName(updatedBy)}
          </span>
        </div>
      )}

      {/* Data Timeline Sheet */}
      {isInteractive && (
        <DataTimeline
          module={module}
          targetId={targetId}
          open={isTimelineOpen}
          onOpenChange={setIsTimelineOpen}
        />
      )}
    </div>
  )
}

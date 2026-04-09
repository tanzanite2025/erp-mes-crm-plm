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
}: AuditStampProps) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  // 仅当传入了 module 和 targetId 时才启用可交互模式
  const isInteractive = !!(module && targetId)
  // 安全清洗日期格式，防止原始数据不规范导致 UI 异常
  const formattedCreatedAt = createdAt ? createdAt.replace('T', ' ').split('.')[0] : '-'
  const formattedUpdatedAt = updatedAt ? updatedAt.replace('T', ' ').split('.')[0] : null

  return (
    <div
      onClick={() => isInteractive && setIsTimelineOpen(true)}
      className={cn(
        'flex flex-col gap-1.5 border-l border-dashed border-muted-foreground/20 pl-4 transition-all duration-300',
        'group/audit font-mono text-[9px] uppercase tracking-tighter opacity-50 hover:opacity-100',
        isInteractive && 'cursor-pointer hover:border-primary/50 active:scale-[0.98]',
        className
      )}
    >
      {/* Interaction Hint - Only visible on hover in interactive mode */}
      {isInteractive && (
        <div className='absolute -left-1.5 top-0 flex h-full items-center opacity-0 transition-opacity group-hover/audit:opacity-100'>
          <div className='flex size-3 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground shadow-lg'>
             <History className='size-2' />
          </div>
        </div>
      )}

      {/* Created Trace */}
      <div className='flex items-center gap-2'>
        <span className='font-black text-primary/60'>CREATED:</span>
        <span className='font-medium text-foreground/80'>{formattedCreatedAt}</span>
        <div className='size-0.5 rounded-full bg-muted-foreground/30' />
        <span className='font-black italic text-slate-500'>
          @{auditUtils.formatOperatorName(createdBy)}
        </span>
      </div>

      {/* Updated Trace (Only if exists and different from creation) */}
      {formattedUpdatedAt && updatedAt !== createdAt && (
        <div className='flex items-center gap-2 animate-in fade-in slide-in-from-left-1'>
          <span className='font-black text-amber-600/60'>UPDATED:</span>
          <span className='font-medium text-foreground/80'>{formattedUpdatedAt}</span>
          <div className='size-0.5 rounded-full bg-muted-foreground/30' />
          <span className='font-black italic text-slate-500'>
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

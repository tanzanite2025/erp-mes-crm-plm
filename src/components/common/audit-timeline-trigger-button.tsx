import { useState } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTimeline } from '@/features/audit-timeline/components/data-timeline'
import { type AuditModuleValue } from '@/features/audit-timeline/data/audit-modules'
import { cn } from '@/lib/utils'

interface AuditTimelineTriggerButtonProps {
  module: AuditModuleValue
  targetId?: string
  targetName?: string
  label?: string
  className?: string
}

export function AuditTimelineTriggerButton({
  module,
  targetId,
  targetName,
  label = '变更记录',
  className,
}: AuditTimelineTriggerButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => setOpen(true)}
        className={cn(
          'h-9 rounded-full border-dashed px-4 text-[10px] font-black uppercase tracking-widest',
          className,
        )}
      >
        <History className='size-3.5' />
        {label}
      </Button>
      <DataTimeline
        module={module}
        targetId={targetId}
        targetName={targetName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

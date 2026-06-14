import { useState } from 'react'
import { History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { DataTimeline } from '@/features/audit-timeline/components/data-timeline'
import { type AuditModuleValue } from '@/features/audit-timeline/data/audit-modules'

interface AuditTimelineTriggerButtonProps {
  module: AuditModuleValue
  targetId?: string
  targetName?: string
  label?: string
  iconOnly?: boolean
  className?: string
}

export function AuditTimelineTriggerButton({
  module,
  targetId,
  targetName,
  label,
  iconOnly = false,
  className,
}: AuditTimelineTriggerButtonProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const resolvedLabel = label || t('common.audit.trigger')

  return (
    <>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => setOpen(true)}
        aria-label={resolvedLabel}
        className={cn(
          'h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase',
          iconOnly && 'size-8 rounded-full px-0',
          className
        )}
      >
        <History className='size-3.5' />
        {iconOnly ? null : resolvedLabel}
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

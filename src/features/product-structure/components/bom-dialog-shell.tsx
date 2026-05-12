'use client'

import type { ReactNode } from 'react'
import { Layers } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'

interface BOMDialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEdit: boolean
  auditTarget?: {
    id: string
    name: string
  }
  children: ReactNode
}

export function BOMDialogShell({
  open,
  onOpenChange,
  isEdit,
  auditTarget,
  children,
}: BOMDialogShellProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[94vh] max-h-[94vh] max-w-[98vw] flex-col gap-0 overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[95vw]'>
        <DialogHeader className='relative flex-none p-3 pb-1 text-start sm:p-4'>
          <div className='flex items-center justify-between gap-3'>
            <DialogTitle className='flex items-center gap-2 pr-8 text-base font-black tracking-tighter uppercase italic sm:gap-3 sm:text-xl'>
              <Layers className='size-5 shrink-0 text-blue-600 stroke-3 sm:size-6' />
              <span className='truncate sm:whitespace-normal'>
                {isEdit
                  ? t('engineering.bomArchive.dialog.editTitle')
                  : t('engineering.bomArchive.dialog.createTitle')}
              </span>
            </DialogTitle>
            {isEdit && auditTarget ? (
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.bom}
                targetId={auditTarget.id}
                targetName={auditTarget.name}
                className='h-9 rounded-full border-dashed bg-background/80 px-4 text-[10px] font-black uppercase tracking-widest'
              />
            ) : null}
          </div>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

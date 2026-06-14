'use client'

import type { ReactNode } from 'react'
import { Layers, XIcon } from 'lucide-react'
import { normalizeBomStatus } from '@/lib/codecs/code-normalization'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'

type BOMDialogHeaderMeta = {
  version?: string
  status?: string
}

type BOMStatusLabelKey =
  | 'engineering.bomArchive.status.draft'
  | 'engineering.bomArchive.status.active'
  | 'engineering.bomArchive.status.reviewing'
  | 'engineering.bomArchive.status.approved'
  | 'engineering.bomArchive.status.released'
  | 'engineering.bomArchive.status.archived'
  | 'engineering.bomArchive.status.obsolete'

function resolveBOMStatusMeta(statusValue: string | undefined): {
  labelKey: BOMStatusLabelKey
  className: string
} {
  const status = normalizeBomStatus(statusValue)
  const config: Record<
    string,
    { labelKey: BOMStatusLabelKey; className: string }
  > = {
    draft: {
      labelKey: 'engineering.bomArchive.status.draft',
      className: 'bg-slate-500/10 text-slate-600',
    },
    active: {
      labelKey: 'engineering.bomArchive.status.active',
      className: 'bg-emerald-500/10 text-emerald-600',
    },
    reviewing: {
      labelKey: 'engineering.bomArchive.status.reviewing',
      className: 'bg-amber-500/10 text-amber-600',
    },
    approved: {
      labelKey: 'engineering.bomArchive.status.approved',
      className: 'bg-cyan-500/10 text-cyan-600',
    },
    released: {
      labelKey: 'engineering.bomArchive.status.released',
      className: 'bg-emerald-500/20 text-emerald-700 animate-pulse',
    },
    archived: {
      labelKey: 'engineering.bomArchive.status.archived',
      className: 'bg-rose-500/10 text-rose-600',
    },
    obsolete: {
      labelKey: 'engineering.bomArchive.status.obsolete',
      className: 'bg-zinc-500/10 text-zinc-600 grayscale',
    },
  }

  return config[status] ?? config.draft
}

interface BOMDialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEdit: boolean
  headerMeta?: BOMDialogHeaderMeta
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
  headerMeta,
  auditTarget,
  children,
}: BOMDialogShellProps) {
  const { t } = useLanguage()
  const version = headerMeta?.version?.trim() ?? ''
  const status = headerMeta?.status?.trim() ?? ''
  const statusMeta = status ? resolveBOMStatusMeta(status) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='flex h-[94vh] max-h-[94vh] max-w-[98vw] flex-col gap-0 overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[95vw]'
      >
        <DialogHeader className='relative flex-none px-3 pt-2.5 pb-1 text-start sm:px-4 sm:pt-3 sm:pb-1'>
          <div className='flex w-full items-start justify-between gap-3'>
            <div className='flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden'>
              <DialogTitle className='flex min-w-0 flex-1 items-center gap-2 text-base font-black tracking-tighter uppercase italic sm:gap-3 sm:text-xl'>
                <Layers className='size-5 shrink-0 stroke-3 text-blue-600 sm:size-6' />
                <span className='truncate sm:whitespace-normal'>
                  {isEdit
                    ? t('engineering.bomArchive.dialog.editTitle')
                    : t('engineering.bomArchive.dialog.createTitle')}
                </span>
              </DialogTitle>
              {version || statusMeta ? (
                <div className='flex shrink-0 items-center gap-2.5'>
                  {version ? (
                    <div className='inline-flex h-6 items-center gap-1.5 rounded-full border border-dashed border-blue-200 bg-blue-600/5 px-2.5'>
                      <span className='text-[10px] font-black tracking-widest text-blue-700/60 uppercase'>
                        {t('engineering.bomArchive.form.version')}
                      </span>
                      <span className='font-mono text-[11px] text-blue-700'>
                        {version}
                      </span>
                    </div>
                  ) : null}
                  {statusMeta ? (
                    <Badge
                      variant='outline'
                      className={cn(
                        'h-6 rounded-full border-none px-2.5 text-[10px] font-black tracking-widest uppercase',
                        statusMeta.className
                      )}
                    >
                      {t(statusMeta.labelKey)}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              {isEdit && auditTarget ? (
                <AuditTimelineTriggerButton
                  module={AUDIT_MODULES.bom}
                  targetId={auditTarget.id}
                  targetName={auditTarget.name}
                  className='h-9 rounded-full border-dashed bg-background/80 px-4 text-[10px] font-black tracking-widest uppercase'
                />
              ) : null}
              <DialogClose className='inline-flex size-9 items-center justify-center rounded-full border border-dashed border-border/50 bg-background/85 text-muted-foreground transition-all hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none'>
                <XIcon className='size-4' />
                <span className='sr-only'>Close</span>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

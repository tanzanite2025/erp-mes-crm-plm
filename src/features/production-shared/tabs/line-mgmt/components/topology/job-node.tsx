import { memo, useEffect, useState } from 'react'
import { Check, BriefcaseBusiness, MoreVertical, ShieldCheck, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { JobCategory } from '../../types'
import { SecurityAuthDialog } from './security-auth-dialog'
import { useLanguage } from '@/context/language-provider'

interface JobNodeProps {
  segmentId: string
  jobCategory: JobCategory
  onUpdateName: (segmentId: string, jobCategoryId: string, name: string) => void
  onRemove: (segmentId: string, jobCategoryId: string) => void
}

export const JobNode = memo(({
  segmentId,
  jobCategory,
  onUpdateName,
  onRemove,
}: JobNodeProps) => {
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(jobCategory.name)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'rename' | 'remove' | null>(null)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setEditValue(jobCategory.name)
    }, 0)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [jobCategory.name])

  const handleAuthConfirm = () => {
    if (pendingAction === 'rename') {
      setIsEditing(true)
    } else if (pendingAction === 'remove') {
      onRemove(segmentId, jobCategory.id)
    }
  }

  const handleSave = () => {
    if (editValue.trim() !== '') {
      onUpdateName(segmentId, jobCategory.id, editValue)
    } else {
      setEditValue(jobCategory.name)
    }
    setIsEditing(false)
  }

  const processes = jobCategory.processes || []

  return (
    <div className='group/job-category relative flex h-auto min-h-0 w-full flex-col items-start rounded-[24px] border border-muted/30 bg-background/80 shadow-sm backdrop-blur-sm transition-all hover:border-blue-400/20 hover:shadow-md dark:bg-white/4'>
      <div className='flex w-full flex-col justify-start p-3'>
        <div className='mb-1 flex w-full items-center gap-2 text-sm font-black uppercase tracking-tighter text-slate-800 dark:text-slate-100'>
          <BriefcaseBusiness className='size-4 shrink-0 text-blue-500' />
          <span className='shrink-0 pl-1 text-[9px] font-bold tracking-widest text-blue-600/40'>[{t('orgPersonnel.lineMgmt.topology.jobCategory')}]</span>

          {isEditing ? (
            <div className='animate-in fade-in zoom-in-95 flex flex-1 items-center gap-1 duration-200'>
              <Input
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSave()
                  if (event.key === 'Escape') {
                    setEditValue(jobCategory.name)
                    setIsEditing(false)
                  }
                }}
                className='h-7 min-w-0 flex-1 border-none bg-blue-50/50 px-1.5 text-xs font-black tracking-tight focus:ring-1 focus:ring-blue-200 dark:bg-blue-500/10 dark:text-slate-100'
                autoFocus
              />
              <button onClick={handleSave} className='pr-1 text-emerald-500'>
                <Check className='size-4' />
              </button>
            </div>
          ) : (
            <span className='flex-1 truncate px-1.5 text-xs font-black tracking-tight text-slate-700 dark:text-slate-200'>
              {jobCategory.name}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type='button'
                className='flex size-7 shrink-0 items-center justify-center text-slate-300 opacity-0 transition-opacity hover:text-slate-600 group-hover/job-category:opacity-100 dark:text-slate-500 dark:hover:text-slate-300'
              >
                <MoreVertical className='size-4' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='rounded-2xl border border-border/50 bg-background/95 p-1 shadow-xl backdrop-blur-md dark:bg-popover/95'>
              <DropdownMenuItem
                onClick={() => {
                  setPendingAction('rename')
                  setIsAuthOpen(true)
                }}
                className='cursor-pointer gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest'
              >
                <ShieldCheck className='size-3.5 text-blue-500' />
                {t('orgPersonnel.lineMgmt.topology.renameJobCategory')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setPendingAction('remove')
                  setIsAuthOpen(true)
                }}
                className='cursor-pointer gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-500 focus:text-rose-600'
              >
                <X className='size-3.5' />
                {t('orgPersonnel.lineMgmt.topology.removeJobCategory')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className='mt-2 flex w-full flex-col gap-3 pl-2'>
          {processes.length === 0 ? (
            <p className='text-[10px] italic text-muted-foreground/45'>
              {t('orgPersonnel.lineMgmt.editor.noProcesses')}
            </p>
          ) : (
            <div className='flex flex-wrap gap-2'>
              {processes.map((process) => (
                <span
                  key={process.id}
                  className='rounded-full border border-blue-100 bg-blue-50/70 px-2.5 py-1 text-[10px] font-mono tracking-wider text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200'
                >
                  {process.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <SecurityAuthDialog
        open={isAuthOpen}
        onOpenChange={setIsAuthOpen}
        onConfirm={handleAuthConfirm}
        title={pendingAction === 'rename'
          ? t('orgPersonnel.lineMgmt.topology.jobCategoryRenameTitle')
          : t('orgPersonnel.lineMgmt.topology.jobCategoryRemoveTitle')}
        description={pendingAction === 'rename'
          ? t('orgPersonnel.lineMgmt.topology.jobCategoryRenameDesc')
          : t('orgPersonnel.lineMgmt.topology.jobCategoryRemoveDesc')}
      />
    </div>
  )
})

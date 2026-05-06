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
  level2Name: string
  level3Name: string
  onUpdateName: (segmentId: string, jobCategoryId: string, name: string) => void
  onRemove: (segmentId: string, jobCategoryId: string) => void
}

export const JobNode = memo(({
  segmentId,
  jobCategory,
  level2Name,
  level3Name,
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
    <div className='group/job-category relative flex h-auto min-h-0 w-full flex-col items-start rounded-[24px] border border-dashed border-muted/30 bg-background/85 shadow-none transition-all hover:border-cyan-500/20 hover:bg-cyan-500/5'>
      <div className='flex w-full flex-col justify-start p-4'>
        <div className='mb-2 flex w-full items-center gap-2 text-sm font-black uppercase tracking-tighter text-foreground'>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-full border border-cyan-500/15 bg-cyan-500/5'>
            <BriefcaseBusiness className='size-4 text-cyan-600' />
          </div>
          <span className='shrink-0 pl-1 text-[9px] font-black tracking-[0.24em] text-cyan-700/40'>[{level2Name}]</span>

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
                className='h-8 min-w-0 flex-1 border border-cyan-500/15 bg-cyan-500/5 px-2 text-xs font-black tracking-tight focus:ring-1 focus:ring-cyan-200'
                autoFocus
              />
              <button onClick={handleSave} className='pr-1 text-emerald-500'>
                <Check className='size-4' />
              </button>
            </div>
          ) : (
            <span className='flex-1 truncate px-1.5 text-xs font-black tracking-tight text-foreground/85'>
              {jobCategory.name}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type='button'
                className='flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted/40 hover:text-foreground group-hover/job-category:opacity-100'
              >
                <MoreVertical className='size-4' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='rounded-2xl border border-dashed border-muted/40 bg-background/95 p-1 shadow-xl backdrop-blur-md'>
              <DropdownMenuItem
                onClick={() => {
                  setPendingAction('rename')
                  setIsAuthOpen(true)
                }}
                className='cursor-pointer gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em]'
              >
                <ShieldCheck className='size-3.5 text-cyan-600' />
                {t('orgPersonnel.lineMgmt.topology.renameLevel', { levelName: level2Name })}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setPendingAction('remove')
                  setIsAuthOpen(true)
                }}
                className='cursor-pointer gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500 focus:text-rose-600'
              >
                <X className='size-3.5' />
                {t('orgPersonnel.lineMgmt.topology.removeLevel', { levelName: level2Name })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className='mt-2 flex w-full flex-col gap-3 pl-1'>
          {processes.length === 0 ? (
            <p className='text-[10px] text-muted-foreground/45'>
              {t('orgPersonnel.lineMgmt.editor.noLevelsConfigured', { levelName: level3Name })}
            </p>
          ) : (
            <div className='flex flex-wrap gap-2'>
              {processes.map((process) => (
                <span
                  key={process.id}
                  className='rounded-full border border-cyan-500/15 bg-cyan-500/5 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-cyan-700'
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
          ? t('orgPersonnel.lineMgmt.topology.levelRenameTitle', { levelName: level2Name })
          : t('orgPersonnel.lineMgmt.topology.levelRemoveTitle', { levelName: level2Name })}
        description={pendingAction === 'rename'
          ? t('orgPersonnel.lineMgmt.topology.levelRenameDesc', { levelName: level2Name })
          : t('orgPersonnel.lineMgmt.topology.levelRemoveDesc', { levelName: level2Name })}
      />
    </div>
  )
})

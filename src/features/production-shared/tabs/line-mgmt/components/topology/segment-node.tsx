import { memo, useEffect, useState } from 'react'
import { Check, Layout, MoreVertical, Plus, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import type { Segment, Station } from '../../types'
import { JobNode } from './job-node'

interface SegmentNodeProps {
  segment: Segment
  onUpdateName: (segmentId: string, name: string) => void
  onRemove: (segmentId: string) => void
  onAddJobCategory: (segmentId: string) => void
  onUpdateJobCategoryName: (segmentId: string, jobCategoryId: string, name: string) => void
  onRemoveJobCategory: (segmentId: string, jobCategoryId: string) => void
  onAddStation: (segmentId: string, jobCategoryId: string) => void
  onUpdateStation: (segmentId: string, jobCategoryId: string, stationId: string, updates: Pick<Station, 'code' | 'name'>) => void
  onRemoveStation: (segmentId: string, jobCategoryId: string, stationId: string) => void
}

export const SegmentNode = memo(({
  segment,
  onUpdateName,
  onRemove,
  onAddJobCategory,
  onUpdateJobCategoryName,
  onRemoveJobCategory,
  onAddStation,
  onUpdateStation,
  onRemoveStation,
}: SegmentNodeProps) => {
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(segment.name)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setEditValue(segment.name)
    }, 0)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [segment.name])

  const handleSave = () => {
    if (editValue.trim() !== '') {
      onUpdateName(segment.id, editValue)
    } else {
      setEditValue(segment.name)
    }
    setIsEditing(false)
  }

  const jobCategories = segment.jobCategories || []

  return (
    <div className='group/segment flex h-auto min-h-0 w-full flex-col gap-5 rounded-[32px] border-2 border-dashed border-muted/30 bg-muted/10 p-4 transition-all hover:bg-muted/15'>
      <div className='flex w-full items-center gap-4 pl-2 text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-slate-100'>
        <Layout className='size-6 shrink-0 text-blue-600' />
        <div className='flex min-w-0 flex-1 items-center gap-4'>
          <span className='shrink-0 text-[10px] font-bold tracking-[0.2em] text-blue-600/30'>[{t('orgPersonnel.lineMgmt.topology.segment')}]</span>

          {isEditing ? (
            <div className='animate-in fade-in zoom-in-95 flex flex-1 items-center gap-2 duration-200'>
              <Input
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSave()
                  if (event.key === 'Escape') {
                    setEditValue(segment.name)
                    setIsEditing(false)
                  }
                }}
                className='h-9 min-w-0 flex-1 border-none bg-blue-50/50 px-2 text-lg font-black tracking-tighter focus:ring-2 focus:ring-blue-200 dark:bg-blue-500/10 dark:text-slate-100'
                autoFocus
              />
              <button onClick={handleSave} className='text-emerald-500 transition-transform hover:scale-110'>
                <Check className='size-6' />
              </button>
            </div>
          ) : (
            <span className='flex-1 truncate px-2 text-lg font-black tracking-tighter text-slate-800 dark:text-slate-100'>
              {segment.name}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='flex size-9 shrink-0 items-center justify-center text-slate-300 opacity-0 transition-opacity hover:text-slate-600 group-hover/segment:opacity-100 dark:text-slate-500 dark:hover:text-slate-300'
              >
                <MoreVertical className='size-5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='rounded-[24px] border border-border/50 bg-background/95 p-1 shadow-2xl backdrop-blur-md dark:bg-popover/95'>
              <DropdownMenuItem
                onClick={() => setIsEditing(true)}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest'
              >
                <ShieldCheck className='size-4 text-blue-500' />
                {t('orgPersonnel.lineMgmt.topology.renameAuth')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRemove(segment.id)}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-rose-500 focus:text-rose-600'
              >
                <X className='size-4' />
                {t('orgPersonnel.lineMgmt.topology.removeAuth')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className='flex h-auto min-h-0 w-full flex-col gap-6 pl-6 sm:pl-10'>
        {jobCategories.map((jobCategory) => (
          <JobNode
            key={jobCategory.id}
            segmentId={segment.id}
            jobCategory={jobCategory}
            onUpdateName={onUpdateJobCategoryName}
            onRemove={onRemoveJobCategory}
            onAddStation={onAddStation}
            onUpdateStation={onUpdateStation}
            onRemoveStation={onRemoveStation}
          />
        ))}

        <Button
          variant='ghost'
          size='sm'
          className='h-10 gap-2 rounded-[24px] border border-dashed border-blue-200 bg-background/70 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/50 shadow-sm transition-all hover:bg-white hover:text-blue-600 active:scale-95 dark:border-blue-400/20 dark:bg-white/4 dark:hover:bg-blue-500/10'
          onClick={() => onAddJobCategory(segment.id)}
        >
          <Plus className='size-4' /> {t('orgPersonnel.lineMgmt.topology.addJobCategory')}
        </Button>
      </div>
    </div>
  )
})

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
import type { Segment } from '../../types'
import { JobNode } from './job-node'

interface SegmentNodeProps {
  segment: Segment
  onUpdateName: (segmentId: string, name: string) => void
  onRemove: (segmentId: string) => void
  onAddJobCategory: (segmentId: string) => void
  onUpdateJobCategoryName: (segmentId: string, jobCategoryId: string, name: string) => void
  onRemoveJobCategory: (segmentId: string, jobCategoryId: string) => void
}

export const SegmentNode = memo(({
  segment,
  onUpdateName,
  onRemove,
  onAddJobCategory,
  onUpdateJobCategoryName,
  onRemoveJobCategory,
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
    <div className='group/segment flex h-auto min-h-0 w-full flex-col gap-4 rounded-[28px] border border-dashed border-cyan-500/15 bg-background/90 p-4 shadow-none transition-all hover:bg-cyan-500/5'>
      <div className='flex w-full items-center gap-3 text-lg font-black uppercase tracking-tighter text-foreground'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-full border border-cyan-500/15 bg-cyan-500/5'>
          <Layout className='size-4 text-cyan-600' />
        </div>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <span className='shrink-0 text-[10px] font-black tracking-[0.24em] text-cyan-700/45'>[{t('orgPersonnel.lineMgmt.topology.segment')}]</span>

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
                className='h-9 min-w-0 flex-1 border border-cyan-500/15 bg-cyan-500/5 px-3 text-base font-black tracking-tight focus:ring-2 focus:ring-cyan-200'
                autoFocus
              />
              <button onClick={handleSave} className='text-emerald-500 transition-transform hover:scale-110'>
                <Check className='size-5' />
              </button>
            </div>
          ) : (
            <span className='flex-1 truncate text-base font-black tracking-tight text-foreground'>
              {segment.name}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted/40 hover:text-foreground group-hover/segment:opacity-100'
              >
                <MoreVertical className='size-5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='rounded-[22px] border border-dashed border-muted/40 bg-background/95 p-1 shadow-2xl backdrop-blur-md'>
              <DropdownMenuItem
                onClick={() => setIsEditing(true)}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em]'
              >
                <ShieldCheck className='size-4 text-cyan-600' />
                {t('orgPersonnel.lineMgmt.topology.renameAuth')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRemove(segment.id)}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500 focus:text-rose-600'
              >
                <X className='size-4' />
                {t('orgPersonnel.lineMgmt.topology.removeAuth')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className='flex h-auto min-h-0 w-full flex-col gap-4 pl-0 sm:pl-10'>
        {jobCategories.map((jobCategory) => (
          <JobNode
            key={jobCategory.id}
            segmentId={segment.id}
            jobCategory={jobCategory}
            onUpdateName={onUpdateJobCategoryName}
            onRemove={onRemoveJobCategory}
          />
        ))}

        <Button
          variant='outline'
          size='sm'
          className='h-10 gap-2 rounded-full border-dashed border-cyan-500/15 bg-cyan-500/5 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700/70 transition-all hover:bg-cyan-500/10 hover:text-cyan-800'
          onClick={() => onAddJobCategory(segment.id)}
        >
          <Plus className='size-4' /> {t('orgPersonnel.lineMgmt.topology.addJobCategory')}
        </Button>
      </div>
    </div>
  )
})

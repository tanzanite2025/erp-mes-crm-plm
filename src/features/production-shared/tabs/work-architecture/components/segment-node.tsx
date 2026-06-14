'use client'

import { useState } from 'react'
import { Activity, Layers, MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { StandardCommand } from '@/features/system-mgmt/workflow-core/data/schema'
import { useCommands } from '@/features/system-mgmt/workflow-core/hooks/use-commands'
import type { Segment } from '../../line-mgmt/types'
import { JobCategoryNode } from './job-category-node'

interface SegmentNodeProps {
  segment: Segment
  level1Name: string
  level2Name: string
  level3Name: string
}

export function SegmentNode({
  segment,
  level1Name,
  level2Name,
  level3Name,
}: SegmentNodeProps) {
  const { t } = useLanguage()
  const { commands } = useCommands()
  const [assignedCmds, setAssignedCmds] = useState<string[]>([])
  const jobCategories = segment.jobCategories || []

  return (
    <div className='group/segment'>
      <div className='flex items-center gap-3 bg-slate-50/50 px-5 py-2 transition-colors group-hover/segment:bg-blue-50/30'>
        <Badge
          variant='outline'
          className='h-5 gap-1 border-blue-600 bg-blue-600 px-1.5 py-0 text-white shadow-sm'
        >
          <Layers className='size-3' />
          <span className='text-[10px]'>{level1Name}</span>
        </Badge>
        <span className='text-sm font-bold text-slate-700'>{segment.name}</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='size-6 rounded-lg text-blue-500/40 transition-all hover:bg-blue-100/50 hover:text-blue-600'
            >
              <MessageSquarePlus className='size-3.5' />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className='w-64 rounded-xl border-2 p-2'
            align='start'
          >
            <div className='space-y-2'>
              <p className='px-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('productionShared.workArchitecture.assignAction')}
              </p>
              <div className='max-h-48 space-y-1 overflow-y-auto'>
                {commands
                  .filter(
                    (command: StandardCommand) =>
                      command.bindType === 'SECTION' ||
                      command.bindType === 'GLOBAL'
                  )
                  .map((command: StandardCommand) => (
                    <Button
                      key={command.id}
                      variant='ghost'
                      className='h-auto w-full justify-start px-2 py-2 text-[11px] font-bold hover:bg-blue-50'
                      onClick={() => {
                        setAssignedCmds((prev) =>
                          Array.from(new Set([...prev, command.title]))
                        )
                        toast.success(
                          t(
                            'productionShared.workArchitecture.assignActionSuccess',
                            {
                              command: command.title,
                              levelName: level1Name,
                              name: segment.name,
                            }
                          )
                        )
                      }}
                    >
                      <div className='flex items-center gap-2'>
                        <div className='size-1.5 shrink-0 rounded-full bg-blue-500' />
                        <span>{command.title}</span>
                      </div>
                    </Button>
                  ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {assignedCmds.length > 0 && (
          <div className='flex animate-in gap-1 zoom-in-95'>
            {assignedCmds.map((title) => (
              <Badge
                key={title}
                variant='outline'
                className='h-4 animate-pulse border-blue-200 bg-blue-50 px-1 text-[8px] font-black text-blue-600'
              >
                <Activity className='mr-0.5 size-2' />
                {title}
              </Badge>
            ))}
          </div>
        )}

        {jobCategories.length === 0 && (
          <span className='ml-1 text-[10px] text-muted-foreground/30 italic'>
            (
            {t('productionShared.workArchitecture.unconfiguredLevel', {
              levelName: level2Name,
            })}
            )
          </span>
        )}
      </div>

      {jobCategories.length > 0 && (
        <div className='space-y-4 px-5 pt-2 pb-4'>
          {jobCategories.map((jobCategory) => (
            <JobCategoryNode
              key={jobCategory.id}
              jobCategory={jobCategory}
              level2Name={level2Name}
              level3Name={level3Name}
            />
          ))}
        </div>
      )}
    </div>
  )
}

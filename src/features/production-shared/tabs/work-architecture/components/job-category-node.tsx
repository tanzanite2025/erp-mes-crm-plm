'use client'

import { useMemo, useState } from 'react'
import { Plus, Workflow, X } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useProductionProcessesQuery } from '../../../hooks/use-production-resources'
import type { JobCategory } from '../../../topology/types'
import { useJobCategoryProcessCapabilities } from '../hooks/use-job-category-process-capabilities'

interface JobCategoryNodeProps {
  jobCategory: JobCategory
  level2Name: string
  level3Name: string
}

export function JobCategoryNode({
  jobCategory,
  level2Name,
  level3Name,
}: JobCategoryNodeProps) {
  const { t } = useLanguage()
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const mappedProcesses = useMemo(
    () => jobCategory.processes ?? [],
    [jobCategory.processes]
  )
  const { data: processLibrary } = useProductionProcessesQuery()
  const { assignProcessCapability, removeProcessCapability } =
    useJobCategoryProcessCapabilities()
  const availableProcesses = useMemo(
    () =>
      (processLibrary ?? []).filter(
        (process) =>
          !mappedProcesses.some(
            (mappedProcess) => mappedProcess.id === process.id
          )
      ),
    [mappedProcesses, processLibrary]
  )

  return (
    <div className='space-y-3 rounded-[24px] border border-dashed border-slate-200 bg-white/70 p-4'>
      <div className='flex items-center gap-3'>
        <Badge
          variant='outline'
          className='h-5 gap-1 border-emerald-600 bg-emerald-600 px-1.5 py-0 text-white shadow-sm'
        >
          <span className='text-[10px]'>{level2Name}</span>
        </Badge>
        <span className='flex-1 text-sm font-bold text-slate-700'>
          {jobCategory.name}
        </span>
        <Popover open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='h-8 rounded-full text-[10px] font-black tracking-widest uppercase'
            >
              <Plus className='mr-1.5 size-3.5' />
              {t('productionShared.workArchitecture.addLevel', {
                levelName: level3Name,
              })}
            </Button>
          </PopoverTrigger>
          <PopoverContent align='end' className='w-72 rounded-2xl border p-2'>
            <div className='space-y-2'>
              <p className='px-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('productionShared.workArchitecture.assignLevelCapability', {
                  levelName: level3Name,
                })}
              </p>
              {availableProcesses.length === 0 ? (
                <p className='px-1 py-2 text-[11px] text-muted-foreground'>
                  {t('productionShared.workArchitecture.allLevelsMapped', {
                    levelName: level3Name,
                  })}
                </p>
              ) : (
                <div className='max-h-56 space-y-1 overflow-y-auto'>
                  {availableProcesses.map((process) => (
                    <Button
                      key={process.id}
                      variant='ghost'
                      className='h-auto w-full justify-start rounded-xl px-2 py-2 text-left'
                      onClick={async () => {
                        await assignProcessCapability(
                          jobCategory.id,
                          process.id
                        )
                        setIsAssignOpen(false)
                      }}
                    >
                      <div className='space-y-0.5'>
                        <div className='flex items-center gap-2'>
                          <Workflow className='size-3.5 text-sky-600' />
                          <span className='text-[11px] font-bold text-slate-700'>
                            {process.name}
                          </span>
                        </div>
                        <div className='pl-5 font-mono text-[10px] text-muted-foreground'>
                          {process.code || 'NO-CODE'}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {mappedProcesses.length === 0 ? (
        <p className='pl-1 text-[10px] text-muted-foreground/35 italic'>
          {t('productionShared.workArchitecture.noLevelMapped', {
            levelName: level3Name,
          })}
        </p>
      ) : (
        <div className='flex flex-wrap gap-2 pl-1'>
          {mappedProcesses.map((process) => (
            <Badge
              key={process.id}
              variant='secondary'
              className='h-7 gap-1 rounded-full border border-sky-100 bg-sky-50 px-2.5 text-[10px] font-bold text-sky-700'
            >
              <Workflow className='size-3' />
              <span>{process.name}</span>
              <button
                type='button'
                className='ml-1 rounded-full text-sky-500 transition-colors hover:text-rose-500'
                onClick={() =>
                  removeProcessCapability(jobCategory.id, process.id)
                }
              >
                <X className='size-3' />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

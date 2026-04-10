'use client'

import { Briefcase } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ProcessStep as LineProcessStep } from '../../line-mgmt/types'
import type { ProcessStep } from './process-utils'

interface ProcessCapabilityNodeProps {
  processNode: LineProcessStep
  resolvedProcesses: Record<string, ProcessStep[]>
}

export function ProcessCapabilityNode({
  processNode,
  resolvedProcesses,
}: ProcessCapabilityNodeProps) {
  const processes = resolvedProcesses[processNode.id] || []

  return (
    <div className='group/process relative space-y-3 border-l-2 border-slate-100 pl-3'>
      <div className='flex items-center justify-between pr-4'>
        <div className='flex items-center gap-3'>
          <Badge
            variant='outline'
            className='h-5 gap-1 border-orange-500 bg-orange-500 px-1.5 py-0 text-white shadow-sm'
          >
            <Briefcase className='size-3' />
            <span className='text-[10px]'>PROCESS</span>
          </Badge>
          <span className='text-xs font-semibold text-slate-600'>{processNode.name}</span>
        </div>
      </div>

      <div className='flex flex-wrap gap-1.5'>
        {processes.length === 0 ? (
          <p className='py-1 pl-1 text-[10px] italic text-muted-foreground/30'>No mapped capabilities</p>
        ) : (
          processes.map((process) => (
            <Badge
              key={process.id}
              variant='secondary'
              className='h-5 border-sky-100 bg-sky-50 px-1.5 py-0 text-[10px] font-bold text-sky-700 transition-all hover:bg-sky-100'
            >
              {process.name}
            </Badge>
          ))
        )}
      </div>
    </div>
  )
}

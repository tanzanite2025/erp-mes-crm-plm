'use client'

import { Badge } from '@/components/ui/badge'
import type { JobCategory } from '../../line-mgmt/types'
import { StationCapabilityNode } from './station-capability-node'

interface JobCategoryNodeProps {
  jobCategory: JobCategory
}

export function JobCategoryNode({ jobCategory }: JobCategoryNodeProps) {
  const stations = jobCategory.stations || []

  return (
    <div className='space-y-3 rounded-[24px] border border-dashed border-slate-200 bg-white/70 p-4'>
      <div className='flex items-center gap-3'>
        <Badge
          variant='outline'
          className='h-5 gap-1 border-emerald-600 bg-emerald-600 px-1.5 py-0 text-white shadow-sm'
        >
          <span className='text-[10px]'>岗位</span>
        </Badge>
        <span className='text-sm font-bold text-slate-700'>{jobCategory.name}</span>
      </div>

      {stations.length === 0 ? (
        <p className='pl-1 text-[10px] italic text-muted-foreground/35'>No stations configured</p>
      ) : (
        <div className='space-y-3 pl-4'>
          {stations.map((station) => (
            <StationCapabilityNode key={station.id} station={station} />
          ))}
        </div>
      )}
    </div>
  )
}

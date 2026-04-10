'use client'

import { Cpu, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Station } from '../../line-mgmt/types'

interface StationCapabilityNodeProps {
  station: Station
}

export function StationCapabilityNode({ station }: StationCapabilityNodeProps) {
  const mappedProcesses = station.processes || []

  return (
    <div className='space-y-3 rounded-[20px] border border-dashed border-slate-200 bg-background/80 p-4'>
      <div className='flex items-center gap-3'>
        <Badge
          variant='outline'
          className='h-5 gap-1 border-purple-600 bg-purple-600 px-1.5 py-0 text-white shadow-sm'
        >
          <MapPin className='size-3' />
          <span className='text-[10px]'>站点</span>
        </Badge>
        <span className='text-sm font-semibold text-slate-700'>{station.name}</span>
        {station.code && (
          <Badge variant='outline' className='font-mono text-[10px]'>
            {station.code}
          </Badge>
        )}
      </div>

      <div className='flex flex-wrap gap-1.5'>
        {mappedProcesses.length === 0 ? (
          <p className='py-1 pl-1 text-[10px] italic text-muted-foreground/30'>No mapped capabilities</p>
        ) : (
          mappedProcesses.map((process) => (
            <Badge
              key={process.id}
              variant='secondary'
              className='h-5 border-sky-100 bg-sky-50 px-1.5 py-0 text-[10px] font-bold text-sky-700 transition-all hover:bg-sky-100'
            >
              <Cpu className='mr-1 size-3' />
              {process.name}
            </Badge>
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import type { Segment } from '../../line-mgmt/types.ts'
import { SegmentNode } from './segment-node.tsx'

interface WorkArchitectureTreeProps {
  segments: Segment[]
}

export function WorkArchitectureTree({ segments }: WorkArchitectureTreeProps) {
  if (!segments || segments.length === 0) {
    return <div className='p-8 text-center text-sm text-muted-foreground'>No topology data</div>
  }

  return (
    <div className='divide-y divide-slate-100'>
      {segments.map((segment) => (
        <SegmentNode key={segment.id} segment={segment} />
      ))}
    </div>
  )
}

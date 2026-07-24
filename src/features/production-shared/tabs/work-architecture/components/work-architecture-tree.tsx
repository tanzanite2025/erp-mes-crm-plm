'use client'

import { useLanguage } from '@/context/language-provider'
import { useProductionTopologyLabels } from '../../../topology/production-topology-labels'
import type { Segment } from '../../../topology/types'
import { SegmentNode } from './segment-node.tsx'

interface WorkArchitectureTreeProps {
  segments: Segment[]
}

export function WorkArchitectureTree({ segments }: WorkArchitectureTreeProps) {
  const { t } = useLanguage()
  const { level2Name, level3Name } = useProductionTopologyLabels()

  if (!segments || segments.length === 0) {
    return (
      <div className='p-8 text-center text-sm text-muted-foreground'>
        {t('productionShared.workArchitecture.treeEmptyDynamic', {
          level2Name,
        })}
      </div>
    )
  }

  return (
    <div className='divide-y divide-slate-100'>
      {segments.map((segment) => (
        <SegmentNode
          key={segment.id}
          segment={segment}
          level2Name={level2Name}
          level3Name={level3Name}
        />
      ))}
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Segment } from '../../line-mgmt/types.ts'
import { useWorkArchitecture } from '../../../hooks/use-work-architecture.ts'
import { getStoredProcesses, type ProcessStep } from './process-utils.ts'
import { SegmentNode } from './segment-node.tsx'

interface WorkArchitectureTreeProps {
  segments: Segment[]
}

export function WorkArchitectureTree({ segments }: WorkArchitectureTreeProps) {
  const { capabilityMappings } = useWorkArchitecture()
  const [allProcesses, setAllProcesses] = useState<ProcessStep[]>([])

  useEffect(() => {
    const loadData = async () => {
      const data = await getStoredProcesses()
      setAllProcesses(data)
    }
    loadData()
  }, [])

  // 性能优化：建立工序索引映射表 O(M) -> O(1)
  const processIndexMap = useMemo(() => {
    const map = new Map<string, ProcessStep>()
    allProcesses.forEach(p => map.set(p.id, p))
    return map
  }, [allProcesses])

  // 核心职责：将 mapping ID 解析为完整的工序对象，供子组件消费
  // 当前 mappings Key 语义为 processNodeId
  const resolvedProcessesMap = useMemo(() => {
    const res: Record<string, ProcessStep[]> = {}
    
    Object.entries(capabilityMappings).forEach(([processNodeId, processIds]) => {
      res[processNodeId] = (processIds || [])
        .map(pid => processIndexMap.get(pid))
        .filter((p): p is ProcessStep => !!p)
    })
    
    return res
  }, [capabilityMappings, processIndexMap])

  if (!segments || segments.length === 0) {
    return (
      <div className='p-8 text-center text-sm text-muted-foreground'>
        暂无拓扑数据
      </div>
    )
  }

  return (
    <div className='divide-y divide-slate-100'>
      {segments.map((segment) => (
        <SegmentNode 
            key={segment.id} 
            segment={segment} 
            resolvedProcesses={resolvedProcessesMap}
        />
      ))}
    </div>
  )
}

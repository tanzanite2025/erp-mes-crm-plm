import type { ProductionLine, TopologyTemplate } from '../types'

export function useLineTopology(line: ProductionLine, onUpdate: (line: ProductionLine) => void) {
  
  // --- 模板应用逻辑 ---
  const handleApplyTemplate = (template: TopologyTemplate) => {
    // 深度克隆并生成新 ID 以确保独立性，同时保留排序索引
    const clonedSegments = template.segments.map((s, sIdx) => ({
      ...s,
      id: crypto.randomUUID(),
      sortOrder: s.sortOrder ?? sIdx,
      processes: (s.processes || []).map((p, pIdx) => ({
        ...p,
        id: crypto.randomUUID(),
        sortOrder: p.sortOrder ?? pIdx,
      }))
    }))
    onUpdate({ ...line, segments: clonedSegments })
  }

  // --- 节点新增逻辑 ---
  const handleAddSegment = () => {
    const newSegment = {
      id: crypto.randomUUID(),
      name: `新工段 ${line.segments?.length + 1 || 1}`,
      sortOrder: line.segments?.length || 0,
      processes: []
    }
    onUpdate({ ...line, segments: [...(line.segments || []), newSegment] })
  }

  const handleAddProcess = (segmentId: string) => {
    const updatedSegments = line.segments?.map(s => {
      if (s.id === segmentId) {
        return {
          ...s,
          processes: [
            ...(s.processes || []),
            { 
              id: crypto.randomUUID(), 
              name: `新工序 ${(s.processes || []).length + 1}`,
              sortOrder: (s.processes || []).length,
            }
          ]
        }
      }
      return s
    })
    onUpdate({ ...line, segments: updatedSegments })
  }

  // --- 节点更新逻辑 ---
  const handleUpdateSegment = (segmentId: string, name: string) => {
    const updatedSegments = line.segments?.map(s => 
      s.id === segmentId ? { ...s, name } : s
    )
    onUpdate({ ...line, segments: updatedSegments })
  }

  const handleUpdateProcess = (segmentId: string, processId: string, name: string) => {
    const updatedSegments = line.segments?.map(s => {
      if (s.id === segmentId) {
        return {
          ...s,
          processes: (s.processes || []).map(p => p.id === processId ? { ...p, name } : p)
        }
      }
      return s
    })
    onUpdate({ ...line, segments: updatedSegments })
  }

  // --- 节点移除逻辑 ---
  const handleRemoveSegment = (segmentId: string) => {
    onUpdate({ ...line, segments: line.segments?.filter(s => s.id !== segmentId) })
  }

  const handleRemoveProcess = (segmentId: string, processId: string) => {
    const updatedSegments = line.segments?.map(s => {
      if (s.id === segmentId) {
          return { ...s, processes: (s.processes || []).filter(p => p.id !== processId) }
      }
      return s
    })
    onUpdate({ ...line, segments: updatedSegments })
  }

  return {
    handleApplyTemplate,
    handleAddSegment,
    handleAddProcess,
    handleUpdateSegment,
    handleUpdateProcess,
    handleRemoveSegment,
    handleRemoveProcess,
  }
}

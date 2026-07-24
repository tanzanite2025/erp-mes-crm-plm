import type { ProductionLine, ProductionSegment } from '../../../data/production-line'
import type { ProductionProcessStep } from '../../../data/production-process'
import type { LineMindmapNode } from '../data/line-mindmap-domain'

export interface LineMindmapLineOption {
  id: string
  label: string
  code: string
  isActive: boolean
}

function createProcessNode(
  process: ProductionProcessStep,
  parentId: string,
  line: ProductionLine
): LineMindmapNode {
  return {
    id: `process-${process.id}`,
    parentId,
    level: 3,
    nameSnapshot: process.name,
    sourceId: process.id,
    sourceType: 'process',
    actionType: 'none',
    dialogKey: '',
    note: '',
    readonlyMeta: {
      code: process.code,
      description: process.description,
      isActive: process.isActive,
      lineId: line.id,
      lineName: line.name,
      sortOrder: process.sortOrder,
    },
    children: [],
  }
}

function createSegmentNode(
  segment: ProductionSegment,
  line: ProductionLine
): LineMindmapNode {
  return {
    id: `segment-${segment.id}`,
    level: 2,
    nameSnapshot: segment.name,
    sourceId: segment.id,
    sourceType: 'segment',
    actionType: 'none',
    dialogKey: '',
    note: '',
    readonlyMeta: {
      description: segment.description,
      lineId: line.id,
      lineName: line.name,
      sortOrder: segment.sortOrder,
    },
    children: (segment.processes ?? []).map((process) =>
      createProcessNode(process, `segment-${segment.id}`, line)
    ),
  }
}

export function toLineMindmapLineOptions(
  lines: ProductionLine[]
): LineMindmapLineOption[] {
  return lines.map((line) => ({
    id: line.id,
    label: line.name,
    code: line.code,
    isActive: line.isActive,
  }))
}

export function toLineMindmapNodes(
  line: ProductionLine | null | undefined
): LineMindmapNode[] {
  if (!line) {
    return []
  }

  return (line.segments ?? []).map((segment) =>
    createSegmentNode(segment, line)
  )
}

export function getDefaultSelectedNodeId(
  nodes: LineMindmapNode[]
): string | null {
  return nodes[0]?.id ?? null
}

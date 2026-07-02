import type {
  ProductionJobCategory,
  ProductionLine,
  ProductionSegment,
} from '../../../data/production-line'
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

function createJobCategoryNode(
  jobCategory: ProductionJobCategory,
  parentId: string,
  line: ProductionLine
): LineMindmapNode {
  return {
    id: `job-category-${jobCategory.id}`,
    parentId,
    level: 2,
    hierarchyOptionId: jobCategory.hierarchyOptionId,
    nameSnapshot: jobCategory.name,
    sourceId: jobCategory.id,
    sourceType: 'jobCategory',
    actionType: 'none',
    dialogKey: '',
    note: '',
    readonlyMeta: {
      description: jobCategory.description,
      lineId: line.id,
      lineName: line.name,
      sortOrder: jobCategory.sortOrder,
    },
    children: (jobCategory.processes ?? []).map((process) =>
      createProcessNode(process, `job-category-${jobCategory.id}`, line)
    ),
  }
}

function createSegmentNode(
  segment: ProductionSegment,
  line: ProductionLine
): LineMindmapNode {
  return {
    id: `segment-${segment.id}`,
    level: 1,
    hierarchyOptionId: segment.hierarchyOptionId,
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
    children: (segment.jobCategories ?? []).map((jobCategory) =>
      createJobCategoryNode(jobCategory, `segment-${segment.id}`, line)
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

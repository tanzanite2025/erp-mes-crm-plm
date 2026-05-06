import type { JobCategory, ProcessStep, ProductionLine, TopologyTemplate } from '../types'
import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import {
  addJobCategoryToLine,
  addSegmentToLine,
  normalizeSegments,
  removeJobCategoryFromLine,
  removeSegmentFromLine,
  renameJobCategoryInLine,
  renameSegmentInLine,
} from '../utils/line-topology-helpers'

function cloneProcess(process: ProcessStep, index: number): ProcessStep {
  return {
    ...process,
    id: crypto.randomUUID(),
    sortOrder: process.sortOrder ?? index,
  }
}

function cloneJobCategory(jobCategory: JobCategory, index: number): JobCategory {
  return {
    ...jobCategory,
    id: crypto.randomUUID(),
    sortOrder: jobCategory.sortOrder ?? index,
    processes: (jobCategory.processes || []).map(cloneProcess),
  }
}

export function useLineTopology(
  line: ProductionLine,
  onUpdate: (line: ProductionLine) => void,
) {
  const handleApplyTemplate = (template: TopologyTemplate) => {
    const clonedSegments = normalizeSegments(
      (template.segments || []).map((segment, segmentIndex) => ({
        ...segment,
        id: crypto.randomUUID(),
        sortOrder: segment.sortOrder ?? segmentIndex,
        jobCategories: (segment.jobCategories || []).map(cloneJobCategory),
      }))
    )

    onUpdate({ ...line, segments: clonedSegments })
  }

  const handleAddSegment = (option: HierarchyLevelOptionItem) => {
    onUpdate(addSegmentToLine(line, option))
  }

  const handleAddJobCategory = (segmentId: string, option: HierarchyLevelOptionItem) => {
    onUpdate(addJobCategoryToLine(line, segmentId, option))
  }

  const handleUpdateSegment = (segmentId: string, name: string) => {
    onUpdate(renameSegmentInLine(line, segmentId, name))
  }

  const handleUpdateJobCategory = (segmentId: string, jobCategoryId: string, name: string) => {
    onUpdate(renameJobCategoryInLine(line, segmentId, jobCategoryId, name))
  }

  const handleRemoveSegment = (segmentId: string) => {
    onUpdate(removeSegmentFromLine(line, segmentId))
  }

  const handleRemoveJobCategory = (segmentId: string, jobCategoryId: string) => {
    onUpdate(removeJobCategoryFromLine(line, segmentId, jobCategoryId))
  }

  return {
    handleApplyTemplate,
    handleAddSegment,
    handleAddJobCategory,
    handleUpdateSegment,
    handleUpdateJobCategory,
    handleRemoveSegment,
    handleRemoveJobCategory,
  }
}

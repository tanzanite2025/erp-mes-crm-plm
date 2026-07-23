import type {
  ProductionJobCategory,
  ProductionLine,
  ProductionSegment,
} from '../data/production-line'
import type { ProductionProcessStep } from '../data/production-process'
import type { HierarchyLevelOptionItem } from '../tabs/hierarchy-config/data/hierarchy-config'

function normalizeProcesses(
  processes: ProductionProcessStep[] = []
): ProductionProcessStep[] {
  return processes.map((process, index) => ({
    ...process,
    sortOrder: index,
  }))
}

function normalizeJobCategories(
  jobCategories: ProductionJobCategory[] = []
): ProductionJobCategory[] {
  return jobCategories.map((jobCategory, index) => ({
    ...jobCategory,
    sortOrder: index,
    processes: normalizeProcesses(jobCategory.processes || []),
  }))
}

export function normalizeSegments(
  segments: ProductionSegment[] = []
): ProductionSegment[] {
  return segments.map((segment, index) => ({
    ...segment,
    sortOrder: index,
    jobCategories: normalizeJobCategories(segment.jobCategories || []),
  }))
}

export function updateLineSegments(
  line: ProductionLine,
  updater: (segments: ProductionSegment[]) => ProductionSegment[]
): ProductionLine {
  return {
    ...line,
    segments: normalizeSegments(updater(line.segments || [])),
  }
}

export function addSegmentToLine(
  line: ProductionLine,
  option: HierarchyLevelOptionItem
): ProductionLine {
  const nextName = option.name.trim()
  if (nextName === '') {
    return line
  }

  return updateLineSegments(line, (segments) => [
    ...segments,
    {
      id: crypto.randomUUID(),
      name: nextName,
      hierarchyOptionId: option.id,
      sortOrder: segments.length,
      jobCategories: [],
    },
  ])
}

export function addJobCategoryToLine(
  line: ProductionLine,
  segmentId: string,
  option: HierarchyLevelOptionItem
): ProductionLine {
  const nextName = option.name.trim()
  if (nextName === '') {
    return line
  }

  return updateLineSegments(line, (segments) =>
    segments.map((segment) => {
      if (segment.id !== segmentId) {
        return segment
      }

      const jobCategories = segment.jobCategories || []
      return {
        ...segment,
        jobCategories: [
          ...jobCategories,
          {
            id: crypto.randomUUID(),
            segmentId,
            name: nextName,
            hierarchyOptionId: option.id,
            sortOrder: jobCategories.length,
            processes: [],
          },
        ],
      }
    })
  )
}

export function renameSegmentInLine(
  line: ProductionLine,
  segmentId: string,
  name: string
): ProductionLine {
  const nextName = name.trim()
  if (nextName === '') {
    return line
  }

  return updateLineSegments(line, (segments) =>
    segments.map((segment) =>
      segment.id === segmentId
        ? { ...segment, name: nextName, hierarchyOptionId: undefined }
        : segment
    )
  )
}

export function renameJobCategoryInLine(
  line: ProductionLine,
  segmentId: string,
  jobCategoryId: string,
  name: string
): ProductionLine {
  const nextName = name.trim()
  if (nextName === '') {
    return line
  }

  return updateLineSegments(line, (segments) =>
    segments.map((segment) => {
      if (segment.id !== segmentId) {
        return segment
      }

      return {
        ...segment,
        jobCategories: (segment.jobCategories || []).map((jobCategory) =>
          jobCategory.id === jobCategoryId
            ? { ...jobCategory, name: nextName, hierarchyOptionId: undefined }
            : jobCategory
        ),
      }
    })
  )
}

export function rebindSegmentInLine(
  line: ProductionLine,
  segmentId: string,
  option: HierarchyLevelOptionItem
): ProductionLine {
  const nextName = option.name.trim()
  if (nextName === '') {
    return line
  }

  return updateLineSegments(line, (segments) =>
    segments.map((segment) =>
      segment.id === segmentId
        ? { ...segment, name: nextName, hierarchyOptionId: option.id }
        : segment
    )
  )
}

export function rebindJobCategoryInLine(
  line: ProductionLine,
  segmentId: string,
  jobCategoryId: string,
  option: HierarchyLevelOptionItem
): ProductionLine {
  const nextName = option.name.trim()
  if (nextName === '') {
    return line
  }

  return updateLineSegments(line, (segments) =>
    segments.map((segment) => {
      if (segment.id !== segmentId) {
        return segment
      }

      return {
        ...segment,
        jobCategories: (segment.jobCategories || []).map((jobCategory) =>
          jobCategory.id === jobCategoryId
            ? {
                ...jobCategory,
                name: nextName,
                hierarchyOptionId: option.id,
              }
            : jobCategory
        ),
      }
    })
  )
}

export function removeSegmentFromLine(
  line: ProductionLine,
  segmentId: string
): ProductionLine {
  return updateLineSegments(line, (segments) =>
    segments.filter((segment) => segment.id !== segmentId)
  )
}

export function removeJobCategoryFromLine(
  line: ProductionLine,
  segmentId: string,
  jobCategoryId: string
): ProductionLine {
  return updateLineSegments(line, (segments) =>
    segments.map((segment) => {
      if (segment.id !== segmentId) {
        return segment
      }

      return {
        ...segment,
        jobCategories: (segment.jobCategories || []).filter(
          (jobCategory) => jobCategory.id !== jobCategoryId
        ),
      }
    })
  )
}

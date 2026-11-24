import {
  getProductionBOMBranchDisplayName,
  type ProductionBOMBranch,
} from '../data/production-bom-branch'
import type {
  ProductionLine,
  ProductionLineSegment,
} from '../data/production-line'
import type { ProductionProcessStep } from '../data/production-process'

function normalizeProcesses(
  processes: ProductionProcessStep[] = []
): ProductionProcessStep[] {
  return processes.map((process, index) => ({
    ...process,
    sortOrder: index,
  }))
}

export function normalizeSegments(
  segments: ProductionLineSegment[] = []
): ProductionLineSegment[] {
  return segments.map((segment, index) => ({
    ...segment,
    sortOrder: index,
    processes: normalizeProcesses(segment.processes || []),
  }))
}

export function updateLineSegments(
  line: ProductionLine,
  updater: (segments: ProductionLineSegment[]) => ProductionLineSegment[]
): ProductionLine {
  return {
    ...line,
    segments: normalizeSegments(updater(line.segments || [])),
  }
}

export function addProductionBOMBranchSegmentToLine(
  line: ProductionLine,
  branch: ProductionBOMBranch
): ProductionLine {
  return updateLineSegments(line, (segments) => [
    ...segments,
    {
      id: crypto.randomUUID(),
      ...branch,
      name: getProductionBOMBranchDisplayName(branch),
      sortOrder: segments.length,
      processes: [],
    },
  ])
}

export function bindProductionBOMBranchToLineSegment(
  line: ProductionLine,
  segmentId: string,
  branch: ProductionBOMBranch
): ProductionLine {
  return updateLineSegments(line, (segments) =>
    segments.map((segment) =>
      segment.id === segmentId
        ? {
            ...segment,
            ...branch,
            name: getProductionBOMBranchDisplayName(branch),
          }
        : segment
    )
  )
}

export function addProcessToLineSegment(
  line: ProductionLine,
  segmentId: string,
  process: ProductionProcessStep
): ProductionLine {
  return updateLineSegments(line, (segments) =>
    segments.map((segment) => {
      if (segment.id !== segmentId) {
        return segment
      }

      if (segment.processes.some((item) => item.id === process.id)) {
        return segment
      }

      return {
        ...segment,
        processes: [...segment.processes, process],
      }
    })
  )
}

export function removeProcessFromLineSegment(
  line: ProductionLine,
  segmentId: string,
  processId: string
): ProductionLine {
  return updateLineSegments(line, (segments) =>
    segments.map((segment) =>
      segment.id === segmentId
        ? {
            ...segment,
            processes: segment.processes.filter(
              (process) => process.id !== processId
            ),
          }
        : segment
    )
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

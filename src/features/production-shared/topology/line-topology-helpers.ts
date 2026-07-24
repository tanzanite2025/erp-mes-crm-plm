import type { ProductionLine, ProductionSegment } from '../data/production-line'
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
  segments: ProductionSegment[] = []
): ProductionSegment[] {
  return segments.map((segment, index) => ({
    ...segment,
    sortOrder: index,
    processes: normalizeProcesses(segment.processes || []),
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
  name: string
): ProductionLine {
  const nextName = name.trim()
  if (!nextName) {
    return line
  }

  return updateLineSegments(line, (segments) => [
    ...segments,
    {
      id: crypto.randomUUID(),
      name: nextName,
      sortOrder: segments.length,
      processes: [],
    },
  ])
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

export function renameSegmentInLine(
  line: ProductionLine,
  segmentId: string,
  name: string
): ProductionLine {
  const nextName = name.trim()
  if (!nextName) {
    return line
  }

  return updateLineSegments(line, (segments) =>
    segments.map((segment) =>
      segment.id === segmentId ? { ...segment, name: nextName } : segment
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

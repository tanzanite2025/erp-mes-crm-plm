import { useLanguage } from '@/context/language-provider'
import type { JobCategory, ProcessStep, ProductionLine, Segment, TopologyTemplate } from '../types'

function normalizeProcesses(processes: ProcessStep[] = []): ProcessStep[] {
  return processes.map((process, index) => ({
    ...process,
    sortOrder: index,
  }))
}

function normalizeJobCategories(jobCategories: JobCategory[] = []): JobCategory[] {
  return jobCategories.map((jobCategory, index) => ({
    ...jobCategory,
    sortOrder: index,
    processes: normalizeProcesses(jobCategory.processes || []),
  }))
}

function normalizeSegments(segments: Segment[] = []): Segment[] {
  return segments.map((segment, index) => ({
    ...segment,
    sortOrder: index,
    jobCategories: normalizeJobCategories(segment.jobCategories || []),
  }))
}

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

export function useLineTopology(line: ProductionLine, onUpdate: (line: ProductionLine) => void) {
  const { t } = useLanguage()

  const updateSegments = (updater: (segments: Segment[]) => Segment[]) => {
    const nextSegments = normalizeSegments(updater(line.segments || []))
    onUpdate({ ...line, segments: nextSegments })
  }

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

  const handleAddSegment = () => {
    updateSegments((segments) => [
      ...segments,
      {
        id: crypto.randomUUID(),
        name: `${t('orgPersonnel.lineMgmt.editor.newSegmentName')} ${segments.length + 1}`,
        sortOrder: segments.length,
        jobCategories: [],
      },
    ])
  }

  const handleAddJobCategory = (segmentId: string) => {
    updateSegments((segments) =>
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
                name: `${t('orgPersonnel.lineMgmt.editor.newJobCategoryName')} ${jobCategories.length + 1}`,
                sortOrder: jobCategories.length,
                processes: [],
              },
            ],
          }
      })
    )
  }

  const handleUpdateSegment = (segmentId: string, name: string) => {
    updateSegments((segments) =>
      segments.map((segment) =>
        segment.id === segmentId
          ? { ...segment, name }
          : segment
      )
    )
  }

  const handleUpdateJobCategory = (segmentId: string, jobCategoryId: string, name: string) => {
    updateSegments((segments) =>
      segments.map((segment) => {
        if (segment.id !== segmentId) {
          return segment
        }

        return {
          ...segment,
          jobCategories: (segment.jobCategories || []).map((jobCategory) =>
            jobCategory.id === jobCategoryId
              ? { ...jobCategory, name }
              : jobCategory
          ),
        }
      })
    )
  }

  const handleRemoveSegment = (segmentId: string) => {
    updateSegments((segments) => segments.filter((segment) => segment.id !== segmentId))
  }

  const handleRemoveJobCategory = (segmentId: string, jobCategoryId: string) => {
    updateSegments((segments) =>
      segments.map((segment) => {
        if (segment.id !== segmentId) {
          return segment
        }

        return {
          ...segment,
          jobCategories: (segment.jobCategories || []).filter((jobCategory) => jobCategory.id !== jobCategoryId),
        }
      })
    )
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

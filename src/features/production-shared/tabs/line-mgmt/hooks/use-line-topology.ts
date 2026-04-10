import { useLanguage } from '@/context/language-provider'
import type { JobCategory, ProcessStep, ProductionLine, Segment, Station, TopologyTemplate } from '../types'

function normalizeProcesses(processes: ProcessStep[] = []): ProcessStep[] {
  return processes.map((process, index) => ({
    ...process,
    sortOrder: index,
  }))
}

function normalizeStations(stations: Station[] = []): Station[] {
  return stations.map((station, index) => ({
    ...station,
    sortOrder: index,
    processes: normalizeProcesses(station.processes || []),
  }))
}

function normalizeJobCategories(jobCategories: JobCategory[] = []): JobCategory[] {
  return jobCategories.map((jobCategory, index) => ({
    ...jobCategory,
    sortOrder: index,
    stations: normalizeStations(jobCategory.stations || []),
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

function cloneStation(station: Station, index: number): Station {
  return {
    ...station,
    id: crypto.randomUUID(),
    sortOrder: station.sortOrder ?? index,
    processes: (station.processes || []).map(cloneProcess),
  }
}

function cloneJobCategory(jobCategory: JobCategory, index: number): JobCategory {
  return {
    ...jobCategory,
    id: crypto.randomUUID(),
    sortOrder: jobCategory.sortOrder ?? index,
    stations: (jobCategory.stations || []).map(cloneStation),
  }
}

function createStationCode(index: number): string {
  return `ST-${String(index).padStart(2, '0')}`
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
              stations: [],
            },
          ],
        }
      })
    )
  }

  const handleAddStation = (segmentId: string, jobCategoryId: string) => {
    updateSegments((segments) =>
      segments.map((segment) => {
        if (segment.id !== segmentId) {
          return segment
        }

        return {
          ...segment,
          jobCategories: (segment.jobCategories || []).map((jobCategory) => {
            if (jobCategory.id !== jobCategoryId) {
              return jobCategory
            }

            const stations = jobCategory.stations || []
            return {
              ...jobCategory,
              stations: [
                ...stations,
                {
                  id: crypto.randomUUID(),
                  categoryId: jobCategoryId,
                  code: createStationCode(stations.length + 1),
                  name: `${t('orgPersonnel.lineMgmt.editor.newStationName')} ${stations.length + 1}`,
                  sortOrder: stations.length,
                  processes: [],
                },
              ],
            }
          }),
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

  const handleUpdateStation = (
    segmentId: string,
    jobCategoryId: string,
    stationId: string,
    updates: Pick<Station, 'code' | 'name'>
  ) => {
    updateSegments((segments) =>
      segments.map((segment) => {
        if (segment.id !== segmentId) {
          return segment
        }

        return {
          ...segment,
          jobCategories: (segment.jobCategories || []).map((jobCategory) => {
            if (jobCategory.id !== jobCategoryId) {
              return jobCategory
            }

            return {
              ...jobCategory,
              stations: (jobCategory.stations || []).map((station) =>
                station.id === stationId
                  ? {
                      ...station,
                      code: updates.code?.trim() || undefined,
                      name: updates.name,
                    }
                  : station
              ),
            }
          }),
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

  const handleRemoveStation = (segmentId: string, jobCategoryId: string, stationId: string) => {
    updateSegments((segments) =>
      segments.map((segment) => {
        if (segment.id !== segmentId) {
          return segment
        }

        return {
          ...segment,
          jobCategories: (segment.jobCategories || []).map((jobCategory) => {
            if (jobCategory.id !== jobCategoryId) {
              return jobCategory
            }

            return {
              ...jobCategory,
              stations: (jobCategory.stations || []).filter((station) => station.id !== stationId),
            }
          }),
        }
      })
    )
  }

  return {
    handleApplyTemplate,
    handleAddSegment,
    handleAddJobCategory,
    handleAddStation,
    handleUpdateSegment,
    handleUpdateJobCategory,
    handleUpdateStation,
    handleRemoveSegment,
    handleRemoveJobCategory,
    handleRemoveStation,
  }
}

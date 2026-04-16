import { useMemo } from 'react'
import type { ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'

function includesTerm(value: string, term: string) {
  return value.toLowerCase().includes(term)
}

export function useFilteredApsSchedulingSource(source: ApsSchedulingSource, searchTerm: string) {
  return useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    if (!term) {
      return source
    }

    return {
      ...source,
      jobs: source.jobs.filter((job) =>
        [job.id, job.orderNo, job.productName, job.lineName].some((value) => includesTerm(value, term)),
      ),
      lanes: source.lanes
        .map((lane) => ({
          ...lane,
          jobs: lane.jobs.filter((job) =>
            [job.id, job.orderNo, job.productName, job.lineName].some((value) => includesTerm(value, term)),
          ),
        }))
        .filter((lane) => lane.jobs.length > 0),
      stageCards: source.stageCards.map((card) => ({
        ...card,
        jobs: card.jobs.filter((job) =>
          [job.id, job.orderNo, job.productName, job.lineName].some((value) => includesTerm(value, term)),
        ),
      })),
    }
  }, [searchTerm, source])
}

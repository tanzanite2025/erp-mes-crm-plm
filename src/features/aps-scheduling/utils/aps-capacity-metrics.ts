import type { ApsJob, ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'

function parseTime(value: string): number | null {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

function estimateJobDurationHours(job: ApsJob): number {
  const start = parseTime(job.startAt)
  const due = parseTime(job.dueAt)
  if (start !== null && due !== null) {
    return Math.max((due - start) / (1000 * 60 * 60), 0.5)
  }

  switch (job.status) {
    case 'running':
      return 6
    case 'late':
      return 8
    case 'done':
      return 4
    default:
      return 2
  }
}

function getWindowHours(jobs: ApsJob[]): number {
  const timestamps = jobs
    .flatMap((job) => [parseTime(job.startAt), parseTime(job.dueAt)])
    .filter((item): item is number => item !== null)

  if (timestamps.length < 2) {
    return Math.max(jobs.length * 4, 8)
  }

  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)
  return Math.max((maxTime - minTime) / (1000 * 60 * 60), 8)
}

export function getApsCapacityMetrics(source: ApsSchedulingSource) {
  const totalJobs = source.jobs.length
  const runningJobs = source.stageCards[1]?.jobs.length ?? 0
  const riskJobs = source.stageCards[2]?.jobs.length ?? 0
  const lineCount = Math.max(source.lanes.length, 1)
  const shiftHours = 8
  const availableHours = lineCount * shiftHours
  const occupiedHours = source.jobs.reduce((sum, job) => sum + estimateJobDurationHours(job), 0)
  const timeWindowHours = getWindowHours(source.jobs)
  const linePressure = Math.min(1, occupiedHours / availableHours)
  const windowPressure = Math.min(1, occupiedHours / timeWindowHours)
  const stagePressure = totalJobs > 0 ? (runningJobs + riskJobs * 0.5) / totalJobs : 0
  const capacityRate =
    totalJobs > 0
      ? Math.min(
          95,
          Math.round((linePressure * 0.45 + windowPressure * 0.35 + stagePressure * 0.2) * 100),
        )
      : 0

  return {
    capacityRate,
    availableHours,
    occupiedHours,
    timeWindowHours,
  }
}

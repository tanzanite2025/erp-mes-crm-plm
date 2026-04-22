import type { ProductionJobCategory, ProductionLine, ProductionProcessStep, ProductionSegment } from '@/features/production-shared/data/production-line'
import type { ApsJob, ApsStageCard, ApsTimelineLaneDefinition } from '../types'
export type { ApsJob } from '../types'

export type ApsProcessTreeProcess = {
  id: string
  name: string
  description?: string
}

export type ApsProcessTreeJobCategory = {
  id: string
  name: string
  description?: string
  processes: ApsProcessTreeProcess[]
}

export type ApsProcessTreeSegment = {
  id: string
  name: string
  description?: string
  jobCategories: ApsProcessTreeJobCategory[]
}

export type ApsProcessTreeLine = {
  id: string
  code: string
  name: string
  description?: string
  segments: ApsProcessTreeSegment[]
}

export type ApsSchedulingSource = {
  jobs: ApsJob[]
  total: number
  timelineSlots: string[]
  lanes: ApsTimelineLaneDefinition[]
  stageCards: ApsStageCard[]
  processTree: ApsProcessTreeLine[]
}

function buildProcessNode(process: ProductionProcessStep): ApsProcessTreeProcess {
  return {
    id: process.id,
    name: process.name,
    description: process.description,
  }
}

function buildJobCategoryNode(jobCategory: ProductionJobCategory): ApsProcessTreeJobCategory {
  return {
    id: jobCategory.id,
    name: jobCategory.name,
    description: jobCategory.description,
    processes: (jobCategory.processes ?? []).map(buildProcessNode),
  }
}

function buildSegmentNode(segment: ProductionSegment): ApsProcessTreeSegment {
  return {
    id: segment.id,
    name: segment.name,
    description: segment.description,
    jobCategories: (segment.jobCategories ?? []).map(buildJobCategoryNode),
  }
}

function buildLineNode(line: ProductionLine): ApsProcessTreeLine {
  return {
    id: line.id,
    code: line.code,
    name: line.name,
    description: line.description,
    segments: (line.segments ?? []).map(buildSegmentNode),
  }
}

export function buildApsSchedulingSource(source: { lines?: ProductionLine[]; jobs?: ApsJob[]; timelineSlots?: string[]; lanes?: ApsTimelineLaneDefinition[]; stageCards?: ApsStageCard[] }): ApsSchedulingSource {
  const jobs = source.jobs ?? []
  const lines = source.lines ?? []
  const processTree = lines.map(buildLineNode)
  const lanes = source.lanes ?? jobs.reduce<ApsTimelineLaneDefinition[]>((acc, job) => {
    const lane = acc.find((item) => item.line === job.lineName)
    if (lane) {
      lane.jobs.push(job)
      return acc
    }
    acc.push({ line: job.lineName, jobs: [job] })
    return acc
  }, [])

  return {
    jobs,
    total: jobs.length,
    timelineSlots: source.timelineSlots ?? ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
    lanes,
    stageCards:
      source.stageCards ?? [
        {
          code: 'A',
          title: '待排产池',
          load: `${jobs.filter((job) => job.status === 'draft').length} JOBS`,
          note: '等待纳入主排程',
          tone: 'from-slate-500/10 to-slate-500/0 text-slate-700',
          jobs: jobs.filter((job) => job.status === 'draft').slice(0, 2),
        },
        {
          code: 'B',
          title: '计划执行中',
          load: `${jobs.filter((job) => job.status === 'running').length} JOBS`,
          note: '已分配资源与窗口',
          tone: 'from-cyan-500/10 to-cyan-500/0 text-cyan-700',
          jobs: jobs.filter((job) => job.status === 'running').slice(0, 2),
        },
        {
          code: 'C',
          title: '风险待调度',
          load: `${jobs.filter((job) => job.status === 'late').length} JOBS`,
          note: '存在交期或产能冲突',
          tone: 'from-rose-500/10 to-rose-500/0 text-rose-700',
          jobs: jobs.filter((job) => job.status === 'late').slice(0, 2),
        },
      ],
    processTree,
  }
}

import type { ApsJob, ApsStageCard, ApsTimelineLaneDefinition } from '../types'
import type { ApsSchedulingListApiDTO } from '../contracts/aps-scheduling-api-dto'

export type ApsSchedulingContract = {
  jobs: ApsJob[]
  lanes: ApsTimelineLaneDefinition[]
  stageCards: ApsStageCard[]
  timelineSlots: string[]
  total: number
  page: number
  pageSize: number
}

function groupJobsByLine(jobs: ApsJob[]): ApsTimelineLaneDefinition[] {
  const laneMap = new Map<string, ApsJob[]>()
  jobs.forEach((job) => {
    const current = laneMap.get(job.lineName) ?? []
    laneMap.set(job.lineName, [...current, job])
  })
  return [...laneMap.entries()].map(([line, laneJobs]) => ({ line, jobs: laneJobs }))
}

function buildStageCards(jobs: ApsJob[]): ApsStageCard[] {
  return [
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
  ]
}

export function toApsSchedulingContract(api: ApsSchedulingListApiDTO): ApsSchedulingContract {
  const jobs = api.items
  const lanes = groupJobsByLine(jobs)

  return {
    jobs,
    lanes,
    timelineSlots: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
    stageCards: buildStageCards(jobs),
    total: api.total,
    page: api.page,
    pageSize: api.pageSize,
  }
}

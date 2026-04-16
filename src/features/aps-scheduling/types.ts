export type ApsJobStatus = 'draft' | 'running' | 'late' | 'done'

export type ApsJob = {
  id: string
  orderNo: string
  productName: string
  lineName: string
  startAt: string
  dueAt: string
  status: ApsJobStatus
}

export type ApsStageCard = {
  code: string
  title: string
  load: string
  note: string
  tone: string
  jobs: ApsJob[]
}

export type ApsTimelineLaneDefinition = {
  line: string
  jobs: ApsJob[]
}

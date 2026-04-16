import type { ApsJobStatus } from '../types'

export type ApsSchedulingJobApiDTO = {
  id: string
  orderNo: string
  productName: string
  lineName: string
  startAt: string
  dueAt: string
  status: ApsJobStatus
}

export type ApsSchedulingListApiDTO = {
  items: ApsSchedulingJobApiDTO[]
  total: number
  page: number
  pageSize: number
}

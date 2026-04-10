export type FurnaceStatusApiDTO = 'IDLE' | 'HEATING' | 'COOLING' | 'MAINTENANCE' | 'FAULT'

export interface FurnaceApiDTO {
  id: string
  sn: string
  name: string
  type: string
  maxTemp: number
  currentTemp: number
  status: FurnaceStatusApiDTO
  location?: string
  description?: string
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt?: string
  version: number
}

export interface FurnaceListPageApiDTO {
  items: FurnaceApiDTO[]
  total: number
  page: number
  pageSize: number
  version: number
}

export interface SaveFurnaceApiDTO {
  id?: string
  sn: string
  name: string
  type: string
  maxTemp: number
  currentTemp: number
  status: FurnaceStatusApiDTO
  location?: string
  description?: string
}

export interface FurnaceTelemetryAckApiDTO {
  status: string
}

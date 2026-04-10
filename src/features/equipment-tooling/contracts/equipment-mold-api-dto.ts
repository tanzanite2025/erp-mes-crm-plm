export type MoldStatusApiDTO =
  | 'IDLE'
  | 'IN_USE'
  | 'CHECKING'
  | 'MAINTENANCE'
  | 'RETIRED'
  | 'LENT_OUT'
  | 'BORROWED'

export interface MoldApiDTO {
  id: string
  sn: string
  name: string
  maxCycles: number
  currentCycles: number
  maintenanceThreshold: number
  totalLifeCycles: number
  groupName?: string
  status: MoldStatusApiDTO
  location?: string
  description?: string
  isAlerted?: boolean
  lastCheckedAt?: string | null
  imageUrl?: string
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt?: string
  version: number
}

export interface MoldListPageApiDTO {
  items: MoldApiDTO[]
  total: number
  page: number
  pageSize: number
  version: number
}

export interface SaveMoldApiDTO {
  id?: string
  sn: string
  name: string
  maxCycles: number
  currentCycles: number
  maintenanceThreshold: number
  totalLifeCycles: number
  groupName?: string
  status: MoldStatusApiDTO
  location?: string
  description?: string
  isAlerted?: boolean
  lastCheckedAt?: string
  imageUrl?: string
}

export interface MoldDuplicateCheckApiDTO {
  duplicate: boolean
}

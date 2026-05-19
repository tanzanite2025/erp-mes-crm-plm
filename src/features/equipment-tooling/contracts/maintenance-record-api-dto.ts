export type MaintenanceRecordTypeApiDTO = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION'

export type MaintenanceRecordStatusApiDTO = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type MaintenanceRecordPriorityApiDTO = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface MaintenanceRecordApiDTO {
  id: string
  assetType: string
  assetId: string
  assetSn: string
  type: MaintenanceRecordTypeApiDTO
  status: MaintenanceRecordStatusApiDTO
  title: string
  description?: string
  priority: MaintenanceRecordPriorityApiDTO
  startedAt?: string | null
  completedAt?: string | null
  cost: number
  remarks?: string
  createdBy?: string
  updatedBy?: string
  version: number
  createdAt: string
  updatedAt?: string
}

export interface SaveMaintenanceRecordApiDTO {
  assetType: string
  assetId: string
  assetSn: string
  type: MaintenanceRecordTypeApiDTO
  title: string
  description?: string
  priority?: MaintenanceRecordPriorityApiDTO
  cost?: number
  remarks?: string
}

export interface MaintenanceRecordStatsApiDTO {
  open: number
  inProgress: number
  completed: number
  cancelled: number
  total: number
}

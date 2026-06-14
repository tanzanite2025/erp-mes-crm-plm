import type { DeltaSet } from '@/lib/delta/types'

export type TeamType = 'dispatch' | 'quality' | 'transfer' | 'receive'

export type TeamStatus = 'active' | 'inactive'

export interface TeamModuleTexts {
  headerTitle: string
  headerDescription: string
  searchPlaceholder: string
  addButtonLabel: string
  confirmDeleteMessage: string
  table: {
    code: string
    name: string
    step: string
    section: string
    type: string
    maintenance: string
    status: string
    audit: string
    commands: string
  }
  typeLabels: Record<TeamType, string>
  maintenanceLabels: {
    true: string
    false: string
  }
  statusLabels: Record<TeamStatus, string>
  empty: {
    title: string
    description: string
  }
  dialog: {
    titleEdit: string
    titleCreate: string
    description: string
    footerTracking: string
    cancel: string
    save: string
    validationRequired: string
    fields: {
      code: string
      name: string
      shortName: string
      step: string
      section: string
      type: string
      maintenance: string
      status: string
      remarks: string
    }
    placeholders: {
      code: string
      name: string
      shortName: string
      section: string
      remarks: string
    }
    sectionOptions: {
      productionControl: string
      materialPrep: string
      batching: string
      molding: string
      machining: string
      finishing: string
    }
    typeOptions: Record<TeamType, string>
    maintenanceDescription: string
    statusDescription: string
    statusOptions: Record<TeamStatus, string>
  }
}

export interface TeamRecord {
  id: string
  code: string
  name: string
  shortName?: string
  step?: number
  section: string
  type: TeamType
  isMaintenance: boolean
  status: TeamStatus
  remarks?: string
  operator?: string
  operateTime?: string
  version: number // SDRTS 乐观锁
  [key: string]: unknown
}

export interface TeamModuleAdapter {
  teams: TeamRecord[]
  isLoading?: boolean
  texts: TeamModuleTexts
  saveTeam: (params: {
    data: Partial<TeamRecord>
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => void | Promise<void>
  deleteTeam: (id: string) => void | Promise<void>
}

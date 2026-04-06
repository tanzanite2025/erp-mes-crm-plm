export type TeamType = 'dispatch' | 'quality' | 'transfer' | 'receive'

export type TeamStatus = 'active' | 'inactive'

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
  [key: string]: unknown
}

export interface TeamModuleAdapter {
  teams: TeamRecord[]
  isLoading?: boolean
  saveTeam: (data: Partial<TeamRecord> & { id?: string }) => void | Promise<void>
  deleteTeam: (id: string) => void | Promise<void>
  headerTitle?: string
  headerDescription?: string
  searchPlaceholder?: string
  addButtonLabel?: string
  confirmDeleteMessage?: string
}

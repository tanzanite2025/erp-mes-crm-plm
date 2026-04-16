export type ProcessModuleStatus = 'active' | 'idle' | 'blocked'

export type ProcessModuleItem = {
  id: string
  code: string
  name: string
  lineName: string
  duration: string
  status: ProcessModuleStatus
  capacity: string
  note: string
}

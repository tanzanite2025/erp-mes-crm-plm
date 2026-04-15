export interface AuditEngineModuleStats {
  id: string
  targetEntityCount: number
  loggedEntityCount: number
  entryEntityCount: number
  coverage: number
  logCoverage: number
  entryCoverage: number
  connected: boolean
  status: 'HEALTHY' | 'ALERT' | 'CRITICAL'
  lastEvent?: string
  connectedEntities: string[]
  loggedEntities: string[]
  entryEntities: string[]
}

export interface AuditEngineStatsResponse {
  modules: AuditEngineModuleStats[]
}

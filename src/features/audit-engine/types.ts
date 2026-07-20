export interface AuditEngineModuleStats {
  id: string
  targetEntityCount: number
  integratedEntityCount: number
  activeEntityCount: number
  integrationCoverage: number
  activityCoverage: number
  connected: boolean
  status: 'HEALTHY' | 'ALERT' | 'CRITICAL'
  lastEvent?: string
  integratedEntities: string[]
  activeEntities: string[]
  missingIntegrationEntities: string[]
}

export interface AuditEngineStatsResponse {
  modules: AuditEngineModuleStats[]
  hotWindowDays: number
  unmappedLogEntities: string[]
  unmappedLogEntityCount: number
}

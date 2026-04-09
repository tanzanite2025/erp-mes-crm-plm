export interface DiffItem {
  f: string; // Field
  o: unknown;    // Old
  n: unknown;    // New
  a: string; // Alias
}

export interface AuditLog {
  id: string;
  module: string;
  target_id: string;
  action: string;
  diff: DiffItem[];
  operator: string;
  ip: string;
  created_at: string;
}

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

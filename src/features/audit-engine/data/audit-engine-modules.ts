// The backend owns the module directory and its display order. This map only
// provides labels for module IDs that already have a product translation.
// Unknown IDs are still rendered by the audit engine component using the raw ID.
export const AUDIT_ENGINE_MODULE_LABEL_KEYS = {
  trading: 'systemManagement.auditEngine.modules.trading',
  finance: 'systemManagement.auditEngine.modules.finance',
  equipment: 'systemManagement.auditEngine.modules.equipment',
  engineering: 'systemManagement.auditEngine.modules.engineering',
  'cutting-engine': 'systemManagement.auditEngine.modules.cuttingEngine',
  warehouse: 'systemManagement.auditEngine.modules.warehouse',
  production: 'systemManagement.auditEngine.modules.production',
  quality: 'systemManagement.auditEngine.modules.quality',
  organization: 'systemManagement.auditEngine.modules.organization',
  system: 'systemManagement.auditEngine.modules.system',
  workflow: 'systemManagement.auditEngine.modules.workflow',
} as const

export type AuditEngineKnownModuleId =
  keyof typeof AUDIT_ENGINE_MODULE_LABEL_KEYS

/** @deprecated Module order is owned by the backend stats response. */
export const AUDIT_ENGINE_MODULE_IDS = Object.keys(
  AUDIT_ENGINE_MODULE_LABEL_KEYS
) as AuditEngineKnownModuleId[]

/** @deprecated Use AuditEngineKnownModuleId for label-map lookups. */
export type AuditEngineModuleId = AuditEngineKnownModuleId

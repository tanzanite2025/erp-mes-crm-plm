export const AUDIT_ENGINE_MODULE_IDS = [
  'trading',
  'finance',
  'equipment',
  'engineering',
  'warehouse',
] as const

export type AuditEngineModuleId = (typeof AUDIT_ENGINE_MODULE_IDS)[number]

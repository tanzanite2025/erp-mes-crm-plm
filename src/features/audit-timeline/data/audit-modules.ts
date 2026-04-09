export const AUDIT_MODULES = {
  salesOrder: 'sales-order',
  purchaseOrder: 'purchase-order',
  customer: 'customer',
  supplier: 'supplier',
  employee: 'employee',
} as const

export type AuditModuleValue = (typeof AUDIT_MODULES)[keyof typeof AUDIT_MODULES]

export const AUDIT_ENGINE_MODULE_IDS = [
  'trading',
  'finance',
  'equipment',
  'engineering',
  'warehouse',
] as const

export type AuditEngineModuleId = (typeof AUDIT_ENGINE_MODULE_IDS)[number]

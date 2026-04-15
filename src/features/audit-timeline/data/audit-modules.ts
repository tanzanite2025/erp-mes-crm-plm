export const AUDIT_MODULES = {
  salesOrder: 'sales-order',
  purchaseOrder: 'purchase-order',
  customer: 'customer',
  supplier: 'supplier',
  employee: 'employee',
} as const

export type AuditModuleValue = (typeof AUDIT_MODULES)[keyof typeof AUDIT_MODULES]

export const AUDIT_MODULES = {
  salesOrder: 'sales-order',
  purchaseOrder: 'purchase-order',
  customer: 'customer',
  product: 'product',
  supplier: 'supplier',
  drilling: 'drilling',
  engineeringSpec: 'engineering-spec',
  employee: 'employee',
  material: 'material',
  inventory: 'inventory',
  shipment: 'shipment',
  logistics: 'logistics',
  packagingAssembly: 'packaging-assembly',
  bom: 'bom',
  user: 'user',
  userPermission: 'user-permission',
  role: 'role',
} as const

export type AuditModuleValue = (typeof AUDIT_MODULES)[keyof typeof AUDIT_MODULES]

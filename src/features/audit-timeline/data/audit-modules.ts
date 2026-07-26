export const AUDIT_MODULES = {
  salesOrder: 'sales-order',
  purchaseOrder: 'purchase-order',
  customer: 'customer',
  product: 'product',
  qualityStandard: 'quality-standard',
  supplier: 'supplier',
  drilling: 'drilling',
  engineeringSpec: 'engineering-spec',
  employee: 'employee',
  outsourcePartner: 'outsource-partner',
  outsourceOrder: 'outsource-order',
  material: 'material',
  inventory: 'inventory',
  shipment: 'shipment',
  logistics: 'logistics',
  packagingAssembly: 'packaging-assembly',
  bom: 'bom',
  user: 'user',
  userPermission: 'user-permission',
  permissionPreset: 'permission-preset',
} as const

export type AuditModuleValue =
  (typeof AUDIT_MODULES)[keyof typeof AUDIT_MODULES]

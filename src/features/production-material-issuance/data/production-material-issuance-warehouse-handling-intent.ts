import type { ProductionMaterialIssuanceWarehouseAction } from '../contracts/production-material-issuance-warehouse-review-batch-availability-and-confirmed-movement-api-dto'

export type ProductionMaterialIssuanceWarehouseHandlingIntent =
  | ProductionMaterialIssuanceWarehouseAction
  | 'review'
  | 'recovery'

export const productionMaterialIssuanceWarehouseConfirmationPermissions = {
  issue: 'action_production_material_issuance_warehouse_issue',
  supplement: 'action_production_material_issuance_warehouse_supplement',
  return: 'action_production_material_issuance_warehouse_return',
} as const

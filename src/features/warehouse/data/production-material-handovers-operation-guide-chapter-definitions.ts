import type { ProductionMaterialIssuanceWarehouseHandlingIntent } from '@/features/production-material-issuance/data/production-material-issuance-warehouse-handling-intent'

/** Steps refer to the shared warehouse workflow; no separate quantity or posting rules. */
export const productionMaterialHandoversOperationGuideChapters = [
  {
    key: 'preparation',
    steps: ['findDocument', 'checkDocument', 'checkPermissions'],
    referenceKeys: ['handling', 'productionGuide'],
  },
  {
    key: 'issue',
    steps: [
      'chooseIssueBatch',
      'allocateIssue',
      'confirmIssue',
      'continueIssue',
    ],
    referenceKeys: ['handling', 'inventory'],
  },
  {
    key: 'supplement',
    steps: ['chooseSupplement', 'assignSupplement', 'confirmSupplement'],
    referenceKeys: ['handling'],
  },
  {
    key: 'return',
    steps: ['chooseOriginalAllocation', 'checkReturnQuantity', 'confirmReturn'],
    referenceKeys: ['handling'],
  },
  {
    key: 'reconciliation',
    steps: ['readQuantities', 'checkMovementHistory', 'checkOverallProgress'],
    referenceKeys: ['handling', 'production', 'requirements'],
  },
  {
    key: 'exceptions',
    steps: [
      'resolveStock',
      'resolveVersion',
      'resolveUnknownResult',
      'correctRecord',
    ],
    referenceKeys: ['handling', 'productionGuide'],
  },
] as const

export type ProductionMaterialHandoversOperationGuideChapter =
  (typeof productionMaterialHandoversOperationGuideChapters)[number]

export type ProductionMaterialHandoversOperationGuideStep =
  ProductionMaterialHandoversOperationGuideChapter['steps'][number]

export const productionMaterialHandoversOperationGuideStepIntents: Partial<
  Record<
    ProductionMaterialHandoversOperationGuideStep,
    ProductionMaterialIssuanceWarehouseHandlingIntent
  >
> = {
  findDocument: 'review',
  checkDocument: 'review',
  chooseIssueBatch: 'issue',
  allocateIssue: 'issue',
  confirmIssue: 'issue',
  continueIssue: 'issue',
  chooseSupplement: 'supplement',
  assignSupplement: 'supplement',
  confirmSupplement: 'supplement',
  chooseOriginalAllocation: 'return',
  checkReturnQuantity: 'return',
  confirmReturn: 'return',
  readQuantities: 'review',
  checkMovementHistory: 'review',
  resolveVersion: 'recovery',
  resolveUnknownResult: 'recovery',
}

export const productionMaterialHandoversOperationGuideReferencePages = {
  handling: '/warehouse/production-material-handovers',
  inventory: '/warehouse',
  production: '/mrp/production-material-issuance',
  productionGuide: '/mrp/production-material-issuance-guide',
  requirements: '/mrp/requirements',
} as const

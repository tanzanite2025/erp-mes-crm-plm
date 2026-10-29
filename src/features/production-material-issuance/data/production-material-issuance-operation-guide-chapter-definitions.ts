/** Reading structure only; formal dispatch and warehouse posting belong to Go domain commands. */
export const productionMaterialIssuanceOperationGuideChapters = [
  {
    key: 'scope',
    topics: [
      'purpose',
      'progressViews',
      'coverage',
      'combinedOrders',
      'consumption',
    ],
    referenceKeys: ['requirementsGuide', 'workspace'],
  },
  {
    key: 'dispatch',
    topics: ['checkBeforeSending', 'sendAndPrint', 'reprint', 'receipt'],
    referenceKeys: ['requirements', 'workspace'],
  },
  {
    key: 'warehouse',
    topics: [
      'pendingDocuments',
      'actualQuantity',
      'lineAllocation',
      'partialIssue',
      'warehouseResponsibility',
    ],
    referenceKeys: ['warehouseHandling', 'workspace', 'inventory'],
  },
  {
    key: 'movements',
    topics: ['quantityMeanings', 'supplement', 'return', 'traceableCorrection'],
    referenceKeys: ['warehouseHandling', 'workspace'],
  },
  {
    key: 'verification',
    topics: [
      'duplicateDispatch',
      'changedBasis',
      'missingRecipe',
      'outstandingReconciliation',
      'statusEvidence',
    ],
    referenceKeys: ['workspace', 'requirementsGuide', 'bomGuide'],
  },
] as const

export type ProductionMaterialIssuanceOperationGuideChapter =
  (typeof productionMaterialIssuanceOperationGuideChapters)[number]

export const productionMaterialIssuanceOperationGuideReferencePages = {
  workspace: '/mrp/production-material-issuance',
  requirements: '/mrp/requirements',
  requirementsGuide: '/mrp/requirements-guide',
  inventory: '/warehouse',
  warehouseHandling: '/warehouse/production-material-handovers',
  bomGuide: '/engineering/bom-creation-guide',
} as const

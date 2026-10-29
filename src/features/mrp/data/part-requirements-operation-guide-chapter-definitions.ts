/** Read-only chapter structure; calculations and business actions stay in their owning modules. */
export const partRequirementsOperationGuideChapters = [
  {
    key: 'preparation',
    topics: ['purpose', 'selectOrders', 'quantityScope', 'prerequisites'],
    referenceKeys: ['requirements', 'orders', 'bomGuide'],
  },
  {
    key: 'sources',
    topics: [
      'salesSource',
      'bomSource',
      'bomPriority',
      'materialSource',
      'weightBoundary',
    ],
    referenceKeys: ['orders', 'bom', 'materials'],
  },
  {
    key: 'calculation',
    topics: ['standardUsage', 'aggregation', 'units', 'flatRecipe'],
    referenceKeys: ['bom', 'materials', 'materialGuide'],
  },
  {
    key: 'supply',
    topics: ['inventorySource', 'pendingSupply', 'sharedInventory', 'snapshot'],
    referenceKeys: ['inventory'],
  },
  {
    key: 'verification',
    topics: [
      'checkCompleteness',
      'sourceOrders',
      'packaging',
      'molds',
      'export',
      'issuanceProgress',
    ],
    referenceKeys: [
      'requirements',
      'packaging',
      'materialGuide',
      'bom',
      'issuanceGuide',
    ],
  },
] as const

export type PartRequirementsOperationGuideChapter =
  (typeof partRequirementsOperationGuideChapters)[number]

export const partRequirementsOperationGuideReferencePages = {
  requirements: '/mrp/requirements',
  orders: '/trading/sales-orders',
  bomGuide: '/engineering/bom-creation-guide',
  bom: '/product-structure/bom',
  materials: '/materials/all',
  materialGuide: '/materials/production-material-creation-guide',
  inventory: '/warehouse',
  packaging: '/materials/assembly',
  issuanceGuide: '/mrp/production-material-issuance-guide',
} as const

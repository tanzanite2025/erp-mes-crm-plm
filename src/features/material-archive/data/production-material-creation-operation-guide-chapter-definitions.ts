/** Reading order and links; material writes and quantity conversions stay in their business modules. */
export const productionMaterialCreationOperationGuideChapters = [
  {
    key: 'purpose',
    topics: [
      'materialIdentity',
      'warehouseScope',
      'classification',
      'workflow',
    ],
    referenceKeys: ['materials', 'inventory', 'bomGuide'],
  },
  {
    key: 'record',
    topics: ['checkExisting', 'chooseUnit', 'dimensions', 'saveRecord'],
    referenceKeys: ['materials', 'units'],
  },
  {
    key: 'conversion',
    topics: ['whenToConvert', 'baseUnit', 'direction', 'singleRule'],
    referenceKeys: ['assembly', 'materials'],
  },
  {
    key: 'gloveExample',
    topics: ['bomUsage', 'wholeBags', 'purchaseQuantity', 'receivedQuantity'],
    referenceKeys: ['assembly', 'requirements', 'purchasing', 'inventory'],
  },
  {
    key: 'handoff',
    topics: [
      'checkRecord',
      'checkConversion',
      'followBusinessFlow',
      'relatedPackaging',
    ],
    referenceKeys: [
      'materials',
      'assembly',
      'bomGuide',
      'requirementsGuide',
      'purchasing',
      'inventory',
    ],
  },
] as const

export type ProductionMaterialCreationOperationGuideChapter =
  (typeof productionMaterialCreationOperationGuideChapters)[number]

export const productionMaterialCreationOperationGuideReferencePages = {
  materials: '/materials/all',
  assembly: '/materials/assembly',
  units: '/basic-settings/units',
  bomGuide: '/engineering/bom-creation-guide',
  requirementsGuide: '/mrp/requirements-guide',
  requirements: '/mrp/requirements',
  purchasing: '/purchase/orders',
  inventory: '/warehouse',
} as const

export const productionMaterialCreationOperationGuideMaterialFieldKeys = [
  'category',
  'name',
  'specification',
  'unit',
  'code',
  'remarks',
] as const

export const productionMaterialCreationOperationGuideConversionFieldKeys = [
  'material',
  'baseUnit',
  'packUnit',
  'factor',
  'direction',
  'preview',
] as const

export const productionMaterialCreationOperationGuideGloveExampleKeys = [
  'requirement',
  'rule',
  'wholeBags',
  'received',
  'remainder',
] as const

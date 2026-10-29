/** Handbook order and links. Business actions are composed in separate entry components. */
export const bomCreationOperationGuideSectionKeys = [
  'purpose',
  'product',
  'performance',
  'recipe',
  'lifecycle',
] as const

export const bomCreationOperationGuideChapterInstructionKeys = {
  purpose: ['prepare', 'open', 'continue'],
  product: ['select', 'ownership', 'identity'],
  performance: ['manage', 'select', 'verify'],
  recipe: ['expand', 'enter', 'check'],
} as const

export const bomCreationOperationGuideManufacturingDerivationStepKeys = [
  'release',
  'derive',
  'verify',
  'publish',
] as const

export const bomCreationOperationGuideProductRecordKeys = [
  'product',
  'ebom',
  'mbom',
] as const
export const bomCreationOperationGuideProductFieldKeys = [
  'product',
  'ownership',
  'identity',
  'effectiveDate',
] as const
export const bomCreationOperationGuideVersionConceptKeys = [
  'performance',
  'revision',
  'lifecycle',
] as const
export const bomCreationOperationGuideRecipeFieldKeys = [
  'material',
  'usage',
  'standard',
  'cost',
] as const
export const bomCreationOperationGuideLifecycleStageKeys = [
  'draft',
  'confirm',
  'use',
  'change',
] as const
export const bomCreationOperationGuideChecklistKeys = [
  'product',
  'version',
  'weight',
  'recipe',
  'save',
] as const

export const bomCreationOperationGuideReferencePages = [
  { key: 'bom', href: '/product-structure/bom' },
  { key: 'groups', href: '/product-structure/section-config' },
  { key: 'records', href: '/product-structure/bom-records' },
  { key: 'productGuide', href: '/engineering/product-creation-guide' },
  {
    key: 'materialGuide',
    href: '/materials/production-material-creation-guide',
  },
] as const

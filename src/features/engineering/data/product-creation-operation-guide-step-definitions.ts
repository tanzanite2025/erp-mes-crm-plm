export const productCreationOperationGuideStepKeys = [
  'template',
  'baseModel',
  'product',
  'bom',
] as const

export type ProductCreationOperationGuideStepKey =
  (typeof productCreationOperationGuideStepKeys)[number]

export type ProductCreationOperationGuideStepStage =
  | 'configuration'
  | 'product'
  | 'followup'

export const productCreationOperationGuideStepDefinitions = {
  template: { tabKey: 'templates', stage: 'configuration' },
  baseModel: { tabKey: 'types', stage: 'configuration' },
  product: { tabKey: 'products', stage: 'product' },
  bom: { tabKey: 'bom', stage: 'followup' },
} as const satisfies Record<
  ProductCreationOperationGuideStepKey,
  { tabKey: string; stage: ProductCreationOperationGuideStepStage }
>

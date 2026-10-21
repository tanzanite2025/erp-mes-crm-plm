import {
  type BarcodeConfig,
  type Product,
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
  type ProductTemplate,
  type ProductType,
} from './data/schema'

export type SaveProductInput = Omit<Product, 'id' | 'version' | 'createdAt'> & {
  id?: string
  version?: number
  createdAt?: string
}

export interface SaveProductOperation {
  data: SaveProductInput
  currentRow?: Product
}

export type SaveProductTypeInput = Omit<ProductType, 'id' | 'version'> & {
  id?: string
  version?: number
}

export type SaveProductTemplateInput = Omit<
  ProductTemplate,
  'id' | 'version'
> & {
  id?: string
  version?: number
}

export type SaveProductTemplateAttributeLevelOneCategoryInput = Omit<
  ProductTemplateAttributeLevelOneCategory,
  'id' | 'version'
> & {
  id?: string
  version?: number
}

export type SaveProductTemplateAttributeLevelTwoOptionInput = Omit<
  ProductTemplateAttributeLevelTwoOption,
  'id' | 'version'
> & {
  id?: string
  version?: number
}

export type ProductDraftOverrides = { [K in keyof Product]?: Product[K] }
export type ProductTemplateDraftOverrides = {
  [K in keyof ProductTemplate]?: ProductTemplate[K]
}
export type BarcodeConfigUpdates = {
  [K in keyof BarcodeConfig]?: BarcodeConfig[K]
}

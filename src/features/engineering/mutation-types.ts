import {
  type BarcodeConfig,
  type Product,
  type ProductAttributeCategory,
  type ProductAttributeOption,
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

export type SaveProductTemplateInput = Omit<ProductTemplate, 'id' | 'version'> & {
  id?: string
  version?: number
}

export type SaveProductAttributeCategoryInput = Omit<ProductAttributeCategory, 'id' | 'version'> & {
  id?: string
  version?: number
}

export type SaveProductAttributeOptionInput = Omit<ProductAttributeOption, 'id' | 'version'> & {
  id?: string
  version?: number
}

export type ProductDraftOverrides = { [K in keyof Product]?: Product[K] }
export type ProductTemplateDraftOverrides = { [K in keyof ProductTemplate]?: ProductTemplate[K] }
export type BarcodeConfigUpdates = { [K in keyof BarcodeConfig]?: BarcodeConfig[K] }

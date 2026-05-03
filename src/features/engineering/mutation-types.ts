import {
  type BOM,
  type BOMItem,
  type BOMSubstitute,
  type BarcodeConfig,
  type Product,
  type ProductAttributeCategory,
  type ProductAttributeOption,
  type ProductTemplate,
  type ProductType,
} from './data/schema'
import { type MaterialOption } from '../material-archive/data/schema'

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

export type SaveBOMInput = Omit<BOM, 'bomDisplayVersion'>

export type ProductDraftOverrides = { [K in keyof Product]?: Product[K] }
export type ProductTemplateDraftOverrides = { [K in keyof ProductTemplate]?: ProductTemplate[K] }
export type BOMItemDraft = { [K in keyof BOMItem]?: BOMItem[K] }
export type MaterialOptionDraft = { [K in keyof MaterialOption]?: MaterialOption[K] }
export type BOMSubstitutePatch = { [K in keyof BOMSubstitute]?: BOMSubstitute[K] }
export type BarcodeConfigUpdates = { [K in keyof BarcodeConfig]?: BarcodeConfig[K] }

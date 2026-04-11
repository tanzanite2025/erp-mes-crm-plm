import {
  type BOM,
  type BOMItem,
  type BOMSubstitute,
  type BarcodeConfig,
  type ChangeOrder,
  type Product,
  type ProductAttributeCategory,
  type ProductAttributeOption,
  type ProductProcessRouting,
  type ProductTemplate,
  type ProductType,
  type ProductTypeAttributeBinding,
} from './data/schema'
import { type MaterialOption } from '../material-archive/data/schema'

export type SaveProductInput = Product

export type SaveProductTypeInput = Omit<ProductType, 'id' | 'version'> & {
  id?: string
  version?: number
}

export type SaveChangeOrderInput = Omit<ChangeOrder, 'id' | 'version'> & {
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

export type SaveProductTypeAttributeBindingInput = Omit<ProductTypeAttributeBinding, 'id' | 'version'> & {
  id?: string
  version?: number
}

export type SaveBOMInput = BOM

export type ProductDraftOverrides = { [K in keyof Product]?: Product[K] }
export type ChangeOrderDraftOverrides = { [K in keyof ChangeOrder]?: ChangeOrder[K] }
export type ProductTemplateDraftOverrides = { [K in keyof ProductTemplate]?: ProductTemplate[K] }
export type ProductRoutingDraftOverrides = { [K in keyof ProductProcessRouting]?: ProductProcessRouting[K] }
export type BOMItemDraft = { [K in keyof BOMItem]?: BOMItem[K] }
export type MaterialOptionDraft = { [K in keyof MaterialOption]?: MaterialOption[K] }
export type BOMSubstitutePatch = { [K in keyof BOMSubstitute]?: BOMSubstitute[K] }
export type BarcodeConfigUpdates = { [K in keyof BarcodeConfig]?: BarcodeConfig[K] }

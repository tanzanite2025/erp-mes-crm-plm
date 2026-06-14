import {
  type Product,
  type ProductAttributeCategory,
  type ProductAttributeOption,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'
import {
  resolveAuthoritativeTemplateForProduct,
  type ProductTemplateResolution,
} from '../utils/product-template-resolution'
import {
  resolveProductDisplayV2,
  type ProductDisplayProjectionV2,
} from './product-display-v2'

export interface ProductDisplayMetadataV2 {
  resolvedTemplate: ProductTemplate | null
  templateResolution: ProductTemplateResolution
  projection: ProductDisplayProjectionV2 | null
}

export interface ResolveProductDisplayMetadataV2Params {
  locale: string
  product: Pick<
    Product,
    | 'name'
    | 'sku'
    | 'modelCode'
    | 'attributeValues'
    | 'typeId'
    | 'templateKey'
    | 'resolvedTemplateId'
    | 'resolvedTemplateKey'
  >
  templates: ProductTemplate[]
  productTypes: ProductType[]
  categories: ProductAttributeCategory[]
  options: ProductAttributeOption[]
  emptyValue?: string
}

export function resolveProductDisplayMetadataV2(
  params: ResolveProductDisplayMetadataV2Params
): ProductDisplayMetadataV2 {
  const templateResolution = resolveAuthoritativeTemplateForProduct(
    params.templates,
    params.product,
    params.productTypes
  )
  const resolvedTemplate = templateResolution.template

  return {
    resolvedTemplate,
    templateResolution,
    projection: resolvedTemplate
      ? resolveProductDisplayV2({
          locale: params.locale,
          product: params.product,
          template: resolvedTemplate,
          categories: params.categories,
          options: params.options,
          emptyValue: params.emptyValue,
        })
      : null,
  }
}

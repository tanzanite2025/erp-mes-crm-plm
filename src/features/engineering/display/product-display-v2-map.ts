import {
  resolveProductDisplayV2,
  type ProductDisplayProjectionV2,
} from './product-display-v2'
import { resolveProductDisplayMetadataV2 } from './product-display-v2-metadata'
import type {
  Product,
  ProductAttributeCategory,
  ProductAttributeOption,
  ProductTemplate,
  ProductType,
} from '../data/schema'

export interface BuildProductDisplayMapsV2Params {
  locale: string
  products: Product[]
  productTemplates: ProductTemplate[]
  productTypes: ProductType[]
  productAttributeCategories: ProductAttributeCategory[]
  productAttributeOptions: ProductAttributeOption[]
}

export function buildProductDisplayMapsV2(
  params: BuildProductDisplayMapsV2Params
): {
  productDisplayLabelMap: Map<string, string>
  productDisplayProjectionMap: Map<string, ProductDisplayProjectionV2>
} {
  const projectionEntries = params.products.map((product) => {
    const displayMetadata = resolveProductDisplayMetadataV2({
      locale: params.locale,
      product,
      templates: params.productTemplates,
      productTypes: params.productTypes,
      categories: params.productAttributeCategories,
      options: params.productAttributeOptions,
    })
    const projection = displayMetadata.projection || resolveProductDisplayV2({
      locale: params.locale,
      product,
    })

    return [product.id, projection] as const
  })

  return {
    productDisplayProjectionMap: new Map(projectionEntries),
    productDisplayLabelMap: new Map(
      projectionEntries.map(([productId, projection]) => [productId, projection.fullLabel])
    ),
  }
}

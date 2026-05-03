export const PRODUCTS_QUERY_KEY = ['engineering', 'products'] as const
export const productOptionsQueryKey = () => [...PRODUCTS_QUERY_KEY, 'options'] as const
export const productListQueryKey = (page: number = 1, pageSize: number = 50) =>
  [...PRODUCTS_QUERY_KEY, 'page', page, pageSize] as const
export const productDetailQueryKey = (id: string) => ['engineering', 'products', id] as const
export const PRODUCT_TYPES_QUERY_KEY = ['engineering', 'productTypes'] as const
export const PRODUCT_TEMPLATES_QUERY_KEY = ['engineering', 'productTemplates'] as const
export const PRODUCT_APPEARANCES_QUERY_KEY = ['engineering', 'productAppearances'] as const
export const PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY = ['engineering', 'productAttributeCategories'] as const
export const PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY = ['engineering', 'productAttributeOptions'] as const
export const ENGINEERING_PRODUCT_FORM_MOLD_GROUPS_QUERY_KEY = ['engineering', 'productForm', 'moldGroups'] as const
export const BOMS_QUERY_KEY = ['engineering', 'boms'] as const

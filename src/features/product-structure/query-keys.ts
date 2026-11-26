export const bomQueryKeys = {
  list: () => ['engineering', 'boms'] as const,
  detail: (id: string) => ['engineering', 'boms', id] as const,
  associationOptions: (productId?: string) =>
    ['engineering', 'boms', 'association-options', { productId }] as const,
}

export const BOMS_QUERY_KEY = bomQueryKeys.list()
export const BOM_PRODUCTION_LINE_OPTIONS_QUERY_KEY = [
  'engineering',
  'production-line-options',
] as const

export const bomSectionQueryKeys = {
  list: () => ['engineering', 'bom-sections'] as const,
  options: () => ['engineering', 'bom-sections', 'options'] as const,
}

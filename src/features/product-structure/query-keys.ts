export const BOMS_QUERY_KEY = ['engineering', 'boms'] as const

export const bomSectionQueryKeys = {
  list: () => ['engineering', 'bom-sections'] as const,
  options: () => ['engineering', 'bom-sections', 'options'] as const,
}

export const bomQueryKeys = {
  list: () => ['engineering', 'boms'] as const,
  detail: (id: string) => ['engineering', 'boms', id] as const,
}

export const BOMS_QUERY_KEY = bomQueryKeys.list()

export const bomSectionQueryKeys = {
  list: () => ['engineering', 'bom-sections'] as const,
  options: () => ['engineering', 'bom-sections', 'options'] as const,
}

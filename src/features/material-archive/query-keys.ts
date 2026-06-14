export const MATERIAL_OPTIONS_QUERY_KEY = [
  'material-archive',
  'options',
] as const
export const PACKAGING_RULES_QUERY_KEY = [
  'material-archive',
  'packaging-rules',
] as const

export function getMaterialListQueryKey(
  category?: string,
  pageIndex: number = 0,
  pageSize: number = 20,
  search: string = ''
) {
  return [
    'material-archive',
    category ?? 'all',
    pageIndex,
    pageSize,
    search,
  ] as const
}

export const BOM_SECTIONS = ['备料', '卷料', '成型', '机加', '精细', '涂装', '包装'] as const

export const BOM_DEFAULT_SECTION = BOM_SECTIONS[0]

export const BOM_SECTION_CATEGORY_MAP: Record<string, string[]> = {
  备料: ['RAW_MATERIAL'],
  卷料: ['RAW_MATERIAL'],
  成型: ['RAW_MATERIAL', 'AUXILIARY'],
  机加: ['CONSUMABLE'],
  精细: ['CONSUMABLE'],
  涂装: ['CHEMICAL', 'AUXILIARY'],
  包装: ['PACKAGING'],
}

export const BOM_SECTION_MATERIAL_TYPE_MAP: Record<string, string> = {
  备料: '直接',
  卷料: '直接',
  成型: '直接',
  机加: '辅助',
  精细: '辅助',
  涂装: '辅助',
  包装: '包装',
}

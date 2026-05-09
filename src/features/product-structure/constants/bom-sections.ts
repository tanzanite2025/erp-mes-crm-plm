export const BOM_SECTION_SEED_CONFIGS = [
  {
    code: 'PREPARE',
    name: '备料',
    sortOrder: 1,
    active: true,
    isDefault: true,
    legacyNames: ['备料'],
  },
  {
    code: 'ROLLING',
    name: '卷料',
    sortOrder: 2,
    active: true,
    isDefault: false,
    legacyNames: ['卷料'],
  },
  {
    code: 'FORMING',
    name: '成型',
    sortOrder: 3,
    active: true,
    isDefault: false,
    legacyNames: ['成型'],
  },
  {
    code: 'MACHINING',
    name: '机加',
    sortOrder: 4,
    active: true,
    isDefault: false,
    legacyNames: ['机加'],
  },
  {
    code: 'FINISHING',
    name: '精细',
    sortOrder: 5,
    active: true,
    isDefault: false,
    legacyNames: ['精细'],
  },
  {
    code: 'COATING',
    name: '涂装',
    sortOrder: 6,
    active: true,
    isDefault: false,
    legacyNames: ['涂装'],
  },
  {
    code: 'PACKAGING',
    name: '包装',
    sortOrder: 7,
    active: true,
    isDefault: false,
    legacyNames: ['包装'],
  },
] as const

export const DEFAULT_BOM_SECTION_CODE = BOM_SECTION_SEED_CONFIGS.find((item) => item.isDefault)?.code ?? BOM_SECTION_SEED_CONFIGS[0].code

export const BOM_SECTIONS = BOM_SECTION_SEED_CONFIGS.map((item) => item.name) as readonly string[]

export const BOM_DEFAULT_SECTION = BOM_SECTION_SEED_CONFIGS.find((item) => item.isDefault)?.name ?? BOM_SECTION_SEED_CONFIGS[0].name

export const LEGACY_BOM_SECTION_CODE_MAP: Record<string, string> = Object.fromEntries(
  BOM_SECTION_SEED_CONFIGS.flatMap((item) => [item.name, ...item.legacyNames].map((name) => [name, item.code]))
)

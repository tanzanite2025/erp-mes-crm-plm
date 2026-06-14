export const HIERARCHY_CONFIG_STORAGE_KEY = 'xdfc_hierarchy_config_v1'

export interface HierarchyLevelConfig {
  id: string
  level: number
  name: string
}

export interface HierarchyLevelOptionItem {
  id: string
  name: string
  code: string
  enabled: boolean
  sortOrder: number
}

export interface HierarchyLevelOptionCatalog {
  level: number
  items: HierarchyLevelOptionItem[]
}

export interface HierarchyConfigSnapshot {
  levels: HierarchyLevelConfig[]
  optionCatalogs: HierarchyLevelOptionCatalog[]
  updatedAt?: string
}

export const DEFAULT_HIERARCHY_LEVELS: HierarchyLevelConfig[] = [
  { id: 'level-1', level: 1, name: '一级' },
  { id: 'level-2', level: 2, name: '二级' },
  { id: 'level-3', level: 3, name: '三级' },
]

export const DEFAULT_HIERARCHY_OPTION_CATALOGS: HierarchyLevelOptionCatalog[] =
  [
    { level: 1, items: [] },
    { level: 2, items: [] },
    { level: 3, items: [] },
  ]

function createHierarchyOptionId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `hierarchy-option-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createHierarchyOptionItem(
  name: string,
  code: string,
  sortOrder: number
): HierarchyLevelOptionItem {
  return {
    id: createHierarchyOptionId(),
    name: name.trim(),
    code: code.trim(),
    enabled: true,
    sortOrder,
  }
}

function normalizeHierarchyLevelOptionItems(
  items: HierarchyLevelOptionItem[] | null | undefined
): HierarchyLevelOptionItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => ({
      id: item?.id || createHierarchyOptionId(),
      name: item?.name?.trim() || '',
      code: item?.code?.trim() || '',
      enabled: typeof item?.enabled === 'boolean' ? item.enabled : true,
      sortOrder: typeof item?.sortOrder === 'number' ? item.sortOrder : index,
    }))
    .filter((item) => item.name !== '')
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item, index) => ({
      ...item,
      sortOrder: index,
    }))
}

function normalizeHierarchyOptionCatalogs(
  catalogs: HierarchyLevelOptionCatalog[] | null | undefined
): HierarchyLevelOptionCatalog[] {
  return DEFAULT_HIERARCHY_OPTION_CATALOGS.map((defaultCatalog) => {
    const matchedCatalog = catalogs?.find(
      (catalog) => catalog.level === defaultCatalog.level
    )
    return {
      level: defaultCatalog.level,
      items: normalizeHierarchyLevelOptionItems(matchedCatalog?.items),
    }
  })
}

export function createDefaultHierarchyConfigSnapshot(
  updatedAt?: string
): HierarchyConfigSnapshot {
  return {
    levels: DEFAULT_HIERARCHY_LEVELS.map((level) => ({ ...level })),
    optionCatalogs: DEFAULT_HIERARCHY_OPTION_CATALOGS.map((catalog) => ({
      level: catalog.level,
      items: [...catalog.items],
    })),
    updatedAt,
  }
}

export function normalizeHierarchyConfigSnapshot(
  snapshot: HierarchyConfigSnapshot | null | undefined
): HierarchyConfigSnapshot {
  if (!snapshot || !Array.isArray(snapshot.levels)) {
    return createDefaultHierarchyConfigSnapshot(snapshot?.updatedAt)
  }

  return {
    levels: DEFAULT_HIERARCHY_LEVELS.map((defaultLevel) => {
      const matchedLevel = snapshot.levels.find(
        (level) =>
          level.level === defaultLevel.level || level.id === defaultLevel.id
      )
      return {
        ...defaultLevel,
        name: matchedLevel?.name?.trim() || defaultLevel.name,
      }
    }),
    optionCatalogs: normalizeHierarchyOptionCatalogs(snapshot.optionCatalogs),
    updatedAt: snapshot.updatedAt,
  }
}

export function getHierarchyLevelName(
  levels: HierarchyLevelConfig[],
  level: number
): string {
  return (
    levels.find((item) => item.level === level)?.name?.trim() ||
    DEFAULT_HIERARCHY_LEVELS.find((item) => item.level === level)?.name ||
    `第${level}层`
  )
}

export function getHierarchyLevelOptions(
  optionCatalogs: HierarchyLevelOptionCatalog[],
  level: number
): HierarchyLevelOptionItem[] {
  return optionCatalogs.find((catalog) => catalog.level === level)?.items ?? []
}

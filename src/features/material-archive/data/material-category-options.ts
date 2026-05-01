import { type AppLocale, type TranslationKey, translate } from '@/locales'

export type MaterialCategoryOption = {
  label: string
  value: string
}

type MaterialCategoryDef = {
  value: string
  labelKey: TranslationKey
}

const MATERIAL_CATEGORY_DEFS: MaterialCategoryDef[] = [
  {
    value: 'RAW_MATERIAL',
    labelKey: 'materialArchive.form.fallbackCategories.rawMaterial',
  },
  {
    value: 'PACKAGING',
    labelKey: 'materialArchive.form.fallbackCategories.packaging',
  },
  {
    value: 'AUXILIARY',
    labelKey: 'materialArchive.form.fallbackCategories.auxiliary',
  },
  {
    value: 'CONSUMABLE',
    labelKey: 'materialArchive.form.fallbackCategories.consumable',
  },
  {
    value: 'CHEMICAL',
    labelKey: 'materialArchive.form.fallbackCategories.chemical',
  },
]

export const MATERIAL_CATEGORY_VALUES = MATERIAL_CATEGORY_DEFS.map(
  (item) => item.value
)

export function resolveMaterialCategoryLabelKey(
  value: string
): TranslationKey | undefined {
  const normalized = value.trim().replace(/-/g, '_').toUpperCase()
  return MATERIAL_CATEGORY_DEFS.find((item) => item.value === normalized)
    ?.labelKey
}

export function getMaterialCategoryOptions(
  locale: AppLocale
): MaterialCategoryOption[] {
  return MATERIAL_CATEGORY_DEFS.map((item) => ({
    value: item.value,
    label: translate(locale, item.labelKey),
  }))
}

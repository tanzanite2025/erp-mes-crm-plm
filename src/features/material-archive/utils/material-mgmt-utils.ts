import { type MaterialCategory } from '../data/schema'

type OptionItem = {
    label: string
    value: string
}

export function resolveCurrentCategoryLabel(
    category: MaterialCategory | undefined,
    options: OptionItem[],
    categoryLabels: Record<string, string>,
    allLabel: string = 'All Materials',
    fallbackLabel: string = 'Material'
) {
    if (!category || category === 'all') return allLabel
    const opt = options.find(o => o.value === category)
    return opt ? opt.label : (categoryLabels[category] || fallbackLabel)
}

export function resolveMaterialCategoryLabel(category: string | undefined, options: OptionItem[]) {
    return options.find(o => o.value.toUpperCase() === (category || '').toUpperCase())?.label || category
}

export function formatMaterialInternalDimensions(
    dimensions:
        | {
              length: number
              width: number
              height: number
          }
        | undefined
) {
    if (!dimensions) return undefined
    return `${dimensions.length}*${dimensions.width}*${dimensions.height}`
}

export function isConflictImportError(message: string) {
    return message.includes('[CONFLICT]')
}


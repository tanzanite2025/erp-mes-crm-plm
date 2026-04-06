import { type MaterialCategory } from '../data/schema'

type OptionItem = {
    label: string
    value: string
}

export function resolveCurrentCategoryLabel(
    category: MaterialCategory | undefined,
    options: OptionItem[],
    categoryLabels: Record<string, string>
) {
    if (!category || category === 'all') return '全部物料'
    const opt = options.find(o => o.value === category)
    return opt ? opt.label : (categoryLabels[category] || '物料')
}

export function resolveMaterialCategoryLabel(category: string | undefined, options: OptionItem[]) {
    return options.find(o => o.value.toUpperCase() === (category || '').toUpperCase())?.label || category
}

export function isConflictImportError(message: string) {
    return message.includes('[CONFLICT]')
}

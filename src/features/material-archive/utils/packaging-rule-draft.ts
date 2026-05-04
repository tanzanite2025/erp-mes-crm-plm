import { type SavePackagingRuleInput } from '../adapters/packaging-api-adapter'
import { type MaterialOption, type PackagingRule } from '../data/schema'

export type PackagingRuleDraft = Partial<SavePackagingRuleInput> & Pick<SavePackagingRuleInput, 'direction'>

/** Creates the default draft for a packaging rule editor session. */
export function createEmptyPackagingRuleDraft(): PackagingRuleDraft {
  return {
    baseUnit: '',
    packUnit: '',
    conversionFactor: 1,
    direction: 'forward',
  }
}

/** Builds the human-readable conversion relation for the current draft or rule. */
export function buildPackagingRuleRelation(
  rule: Pick<PackagingRuleDraft, 'conversionFactor' | 'packUnit' | 'baseUnit' | 'direction'> | null
) {
  const factor = rule?.conversionFactor ?? '?'
  const packUnit = rule?.packUnit || '?'
  const baseUnit = rule?.baseUnit || '?'

  return rule?.direction === 'reverse'
    ? `1 ${baseUnit} = ${factor} ${packUnit}`
    : `1 ${packUnit} = ${factor} ${baseUnit}`
}

/** Applies the selected material back to the current packaging draft. */
export function applySelectedMaterialToPackagingRuleDraft(
  draft: PackagingRuleDraft | null,
  material: Pick<MaterialOption, 'id' | 'uom'>
): PackagingRuleDraft {
  return {
    ...(draft ?? createEmptyPackagingRuleDraft()),
    materialId: material.id,
    baseUnit: material.uom || '',
  }
}

/** Updates a single packaging draft field while preserving the default direction contract. */
export function updatePackagingRuleDraftField<K extends keyof SavePackagingRuleInput>(
  draft: PackagingRuleDraft | null,
  field: K,
  value: SavePackagingRuleInput[K]
): PackagingRuleDraft {
  return {
    ...(draft ?? createEmptyPackagingRuleDraft()),
    [field]: value,
  }
}

/** Toggles the current conversion direction while preserving the rest of the draft. */
export function togglePackagingRuleDirection(draft: PackagingRuleDraft | null): PackagingRuleDraft {
  const current = draft ?? createEmptyPackagingRuleDraft()

  return {
    ...current,
    direction: current.direction === 'forward' ? 'reverse' : 'forward',
  }
}

/** Normalizes the factor input from the dialog into a safe numeric value. */
export function parsePackagingRuleFactor(rawValue: string) {
  const value = Number.parseFloat(rawValue)
  return Number.isNaN(value) ? 0 : value
}

/** Converts the editable draft into a save payload when all required fields are valid. */
export function toSavePackagingRuleInput(draft: PackagingRuleDraft | null): SavePackagingRuleInput | null {
  const factor = draft?.conversionFactor
  const isFactorValid = typeof factor === 'number' && Number.isFinite(factor) && factor > 0

  if (!draft?.materialId || !draft.packUnit || !draft.baseUnit || !isFactorValid) {
    return null
  }

  return {
    id: draft.id,
    materialId: draft.materialId,
    packUnit: draft.packUnit,
    baseUnit: draft.baseUnit,
    conversionFactor: factor,
    direction: draft.direction,
  }
}

/** Rehydrates an editable draft from a persisted packaging rule and resolved base unit. */
export function toPackagingRuleDraft(
  rule: PackagingRule,
  baseUnit: string
): PackagingRuleDraft {
  return {
    ...rule,
    baseUnit,
  }
}

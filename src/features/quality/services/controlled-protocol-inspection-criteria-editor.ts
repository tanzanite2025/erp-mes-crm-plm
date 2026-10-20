import type { StandardItem } from '../data/schema'
import { hasValidControlledProtocolDeviationLimits } from './controlled-protocol-center-based-grading'
import { buildControlledProtocolInspectionStandardItem } from './controlled-protocol-standard-factory'

export interface ControlledProtocolInspectionCriterionFormValue {
  id: string
  itemName: string
  targetWeight: string
  unit: string
  aLevelTolerance: string
  bLevelTolerance: string
}

export function createControlledProtocolInspectionCriteriaFormValues(
  items: StandardItem[]
): ControlledProtocolInspectionCriterionFormValue[] {
  return items.map((item) => ({
    id: item.id,
    itemName: item.name,
    targetWeight: item.centerValue?.toString() ?? '',
    unit: item.unit ?? '',
    aLevelTolerance:
      item.levels.find((level) => level.level === 'A')?.tolerance?.toString() ??
      '',
    bLevelTolerance:
      item.levels.find((level) => level.level === 'B')?.tolerance?.toString() ??
      '',
  }))
}

export function getControlledProtocolInspectionCriteriaValidationError(
  criteria: ControlledProtocolInspectionCriterionFormValue[],
  activeConfiguredUnitCodes?: readonly string[]
) {
  if (criteria.length === 0) return 'criterionRequired'
  if (criteria.some((criterion) => !criterion.itemName.trim())) {
    return 'itemNameRequired'
  }
  if (
    criteria.some(
      (criterion) =>
        !criterion.unit.trim() ||
        (activeConfiguredUnitCodes &&
          !activeConfiguredUnitCodes.includes(criterion.unit))
    )
  ) {
    return 'unitRequired'
  }
  if (
    criteria.some(
      (criterion) =>
        !criterion.targetWeight.trim() ||
        !Number.isFinite(Number(criterion.targetWeight))
    )
  ) {
    return 'weightRequired'
  }
  if (
    criteria.some(
      (criterion) =>
        !criterion.aLevelTolerance.trim() ||
        !criterion.bLevelTolerance.trim() ||
        !hasValidControlledProtocolDeviationLimits(
          Number(criterion.targetWeight),
          Number(criterion.aLevelTolerance),
          Number(criterion.bLevelTolerance)
        )
    )
  ) {
    return 'deviationLimitsInvalid'
  }
  return null
}

export function buildEditedControlledProtocolInspectionStandardItems(
  criteria: ControlledProtocolInspectionCriterionFormValue[],
  originalItems: StandardItem[]
): StandardItem[] {
  const validationError =
    getControlledProtocolInspectionCriteriaValidationError(criteria)
  if (validationError) throw new RangeError(validationError)

  const originalItemsById = new Map(
    originalItems.map((item) => [item.id, item])
  )
  return criteria.map((criterion, index) => {
    const originalItem = originalItemsById.get(criterion.id)
    return {
      ...originalItem,
      ...buildControlledProtocolInspectionStandardItem(
        {
          id: criterion.id,
          itemName: criterion.itemName.trim(),
          targetWeight: Number(criterion.targetWeight),
          unit: criterion.unit.trim(),
          aLevelTolerance: Number(criterion.aLevelTolerance),
          bLevelTolerance: Number(criterion.bLevelTolerance),
        },
        index
      ),
      isRequired: originalItem?.isRequired ?? true,
    }
  })
}

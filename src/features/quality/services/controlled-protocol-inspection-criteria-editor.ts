import type { StandardItem } from '../data/schema'
import type { ControlledProtocolCriterion } from '../types/controlled-protocol'
import {
  buildConfigurableInspectionGradeRules,
  createConfigurableInspectionGradeFormValues,
  hasValidConfigurableInspectionGradeFormValues,
  type ConfigurableInspectionGradeFormValue,
} from './configurable-inspection-deviation-grade-rules'
import { buildControlledProtocolInspectionStandardItem } from './controlled-protocol-standard-factory'

export interface ControlledProtocolInspectionCriterionFormValue {
  gradingMode: 'DEVIATION_BANDS'
  grades: ConfigurableInspectionGradeFormValue[]
  id: string
  itemName: string
  inspectionStageId: string
  inspectionStageName: string
  targetWeight: string
  unit: string
}

export function createControlledProtocolInspectionCriteriaFormValues(
  items: StandardItem[]
): ControlledProtocolInspectionCriterionFormValue[] {
  return items.map((item) => ({
    gradingMode: 'DEVIATION_BANDS',
    grades: createConfigurableInspectionGradeFormValues(item.levels),
    id: item.id,
    itemName: item.name,
    inspectionStageId: item.inspectionStageId,
    inspectionStageName: item.inspectionStageName,
    targetWeight: item.centerValue?.toString() ?? '',
    unit: item.unit ?? '',
  }))
}

export function getControlledProtocolInspectionCriteriaValidationError(
  criteria: ControlledProtocolInspectionCriterionFormValue[],
  activeConfiguredUnitCodes?: readonly string[]
) {
  if (criteria.length === 0) return 'criterionRequired'
  if (
    criteria.some(
      (criterion) =>
        !criterion.inspectionStageId.trim() ||
        !criterion.inspectionStageName.trim()
    )
  ) {
    return 'inspectionStageRequired'
  }
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
        !hasValidConfigurableInspectionGradeFormValues(
          criterion.grades,
          Number(criterion.targetWeight)
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
  let nextNewInspectionItemOrder =
    originalItems.reduce(
      (maximumOrder, item) => Math.max(maximumOrder, item.order),
      0
    ) + 1
  return criteria.map((criterion) => {
    const originalItem = originalItemsById.get(criterion.id)
    const editedCriterion: ControlledProtocolCriterion = {
      id: criterion.id,
      gradingMode: 'DEVIATION_BANDS',
      levels: buildConfigurableInspectionGradeRules(criterion.grades),
      itemName: criterion.itemName.trim(),
      inspectionStageId: criterion.inspectionStageId,
      inspectionStageName: criterion.inspectionStageName,
      targetWeight: Number(criterion.targetWeight),
      unit: criterion.unit.trim(),
    }
    if (!originalItem) {
      const newInspectionItem = buildControlledProtocolInspectionStandardItem(
        editedCriterion,
        nextNewInspectionItemOrder - 1
      )
      nextNewInspectionItemOrder += 1
      return newInspectionItem
    }
    return {
      ...originalItem,
      name: editedCriterion.itemName,
      inspectionStageId: editedCriterion.inspectionStageId,
      inspectionStageName: editedCriterion.inspectionStageName,
      centerValue: editedCriterion.targetWeight,
      gradingMode: editedCriterion.gradingMode,
      levels: editedCriterion.levels,
      unit: editedCriterion.unit,
    }
  })
}

import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { createDefaultStandard } from '../adapters/quality-standard-api-adapter'
import type { Standard } from '../data/schema'
import {
  buildEditedControlledProtocolInspectionStandardItems,
  createControlledProtocolInspectionCriteriaFormValues,
  getControlledProtocolInspectionCriteriaValidationError,
  type ControlledProtocolInspectionCriterionFormValue,
} from '../services/controlled-protocol-inspection-criteria-editor'

interface UseStandardEditorFormOptions {
  initialStandard?: Standard | null
  resetKey: string
  mode: 'create' | 'edit'
}

type StandardFormUpdater =
  | Partial<Standard>
  | ((prev: Standard) => Partial<Standard> | Standard)

export interface StandardEditorSubmitPayload {
  data: Standard
  isPatch: boolean
  delta?: DeltaSet
}

function cloneStandard<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildSnapshot(formData: Standard, overrides?: Partial<Standard>) {
  return cloneStandard({
    ...formData,
    ...overrides,
    code: (overrides?.code ?? formData.code)?.trim() || '',
    name: (overrides?.name ?? formData.name)?.trim() || '',
    remarks: (overrides?.remarks ?? formData.remarks)?.trim() || '',
  })
}

export function useStandardEditorForm({
  initialStandard,
  resetKey,
  mode,
}: UseStandardEditorFormOptions) {
  const { t } = useLanguage()
  const isEdit = mode === 'edit'
  const memoizedInitial = useMemo<Standard>(
    () => cloneStandard(initialStandard ?? createDefaultStandard()),
    [initialStandard]
  )
  const {
    data: formData,
    commit,
    isDirty,
  } = useDeltaTracker(memoizedInitial, resetKey)
  const isControlledProtocol = Boolean(
    memoizedInitial.productId && memoizedInitial.code.startsWith('QCP-')
  )
  const {
    units,
    isLoading: areUnitsLoading,
    error: unitsError,
  } = useUnitsQuery({ enabled: isControlledProtocol })
  const initialInspectionCriteria = useMemo(
    () => ({
      criteria: createControlledProtocolInspectionCriteriaFormValues(
        memoizedInitial.items
      ),
    }),
    [memoizedInitial]
  )
  const {
    data: inspectionCriteriaForm,
    replace: replaceInspectionCriteriaForm,
    isDirty: areInspectionCriteriaDirty,
  } = useDeltaTracker(initialInspectionCriteria, resetKey)
  const updateInspectionCriteria = useCallback(
    (criteria: ControlledProtocolInspectionCriterionFormValue[]) => {
      replaceInspectionCriteriaForm({ criteria })
    },
    [replaceInspectionCriteriaForm]
  )

  const setFormData = useCallback(
    (updater: StandardFormUpdater) => {
      if (typeof updater === 'function') {
        const next = updater(formData)
        Object.assign(formData, next)
        return
      }

      Object.assign(formData, updater)
    },
    [formData]
  )

  const updateField = useCallback(
    <K extends keyof Standard>(key: K, value: Standard[K]) => {
      setFormData({ [key]: value } as Partial<Standard>)
    },
    [setFormData]
  )

  const buildSubmitPayloadWithOverrides = useCallback(
    (overrides?: Partial<Standard>): StandardEditorSubmitPayload | null => {
      if (!formData.code?.trim() || !formData.name?.trim()) {
        toast.error(t('quality.standards.dialog.action.validationRequired'))
        return null
      }

      const snapshot = buildSnapshot(formData, overrides)
      if (isControlledProtocol) {
        if (areUnitsLoading || unitsError) {
          toast.error(
            t(
              areUnitsLoading
                ? 'quality.standards.dialog.controlledProtocol.validation.unitsLoading'
                : 'quality.standards.dialog.controlledProtocol.validation.unitsLoadFailed'
            )
          )
          return null
        }
        const validationError =
          getControlledProtocolInspectionCriteriaValidationError(
            inspectionCriteriaForm.criteria,
            units
              .filter((unit) => unit.status === 'active')
              .map((unit) => unit.code)
          )
        if (validationError) {
          toast.error(
            t(
              `quality.standards.dialog.controlledProtocol.validation.${validationError}`
            )
          )
          return null
        }
        if (areInspectionCriteriaDirty()) {
          snapshot.items = buildEditedControlledProtocolInspectionStandardItems(
            inspectionCriteriaForm.criteria,
            memoizedInitial.items
          )
        }
      }

      if (!isEdit) {
        return {
          data: snapshot,
          isPatch: false,
        }
      }

      const delta = commit()
      if (isControlledProtocol && areInspectionCriteriaDirty()) {
        delta.items = { o: memoizedInitial.items, n: snapshot.items }
      }

      if (overrides) {
        Object.entries(overrides).forEach(([key, nextValue]) => {
          const fieldKey = key as keyof Standard
          const oldValue = memoizedInitial[fieldKey]

          if (oldValue === nextValue) {
            return
          }

          delta[key] = {
            o: oldValue,
            n: nextValue,
          }
        })
      }

      if (Object.keys(delta).length === 0) {
        return null
      }

      return {
        data: snapshot,
        isPatch: true,
        delta,
      }
    },
    [
      areInspectionCriteriaDirty,
      areUnitsLoading,
      commit,
      formData,
      inspectionCriteriaForm,
      isControlledProtocol,
      isEdit,
      memoizedInitial,
      t,
      units,
      unitsError,
    ]
  )

  const buildSubmitPayload = useCallback(
    (): StandardEditorSubmitPayload | null => buildSubmitPayloadWithOverrides(),
    [buildSubmitPayloadWithOverrides]
  )

  return {
    formData,
    setFormData,
    updateField,
    buildSubmitPayload,
    buildSubmitPayloadWithOverrides,
    inspectionCriteria: isControlledProtocol
      ? inspectionCriteriaForm.criteria
      : null,
    updateInspectionCriteria,
    isDirty:
      isDirty() || (isControlledProtocol && areInspectionCriteriaDirty()),
  }
}

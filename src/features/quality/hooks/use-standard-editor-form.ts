import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { createDefaultStandard } from '../adapters/quality-standard-api-adapter'
import type { Standard } from '../data/schema'

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

  const buildSubmitPayload =
    useCallback((): StandardEditorSubmitPayload | null => {
      if (!formData.code?.trim() || !formData.name?.trim()) {
        toast.error(t('quality.standards.dialog.action.validationRequired'))
        return null
      }

      const snapshot = cloneStandard({
        ...formData,
        code: formData.code.trim(),
        name: formData.name.trim(),
        remarks: formData.remarks?.trim() || '',
      })

      if (!isEdit) {
        return {
          data: snapshot,
          isPatch: false,
        }
      }

      const delta = commit()
      if (Object.keys(delta).length === 0) {
        return null
      }

      return {
        data: snapshot,
        isPatch: true,
        delta,
      }
    }, [commit, formData, isEdit, t])

  return {
    formData,
    setFormData,
    updateField,
    buildSubmitPayload,
    isDirty: isDirty(),
  }
}

import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import type { DeltaSet } from '@/lib/delta/types'
import { drillingPlanInputSchema, type DrillingPlan, type DrillingPlanInput } from '../data/schema'
import { ENGINEERING_DB_WEAVING_MODES_QUERY_KEY } from '../query-keys'
import { weavingModeService } from '../services/weaving-mode-service'

type DrillingFormState = DrillingPlanInput & { id?: string; createdAt?: string }
type DrillingFormUpdater = DrillingFormState | ((prev: DrillingFormState) => DrillingFormState)

type DrillingActionDialogSaveParams = {
  data: DrillingPlanInput
  isPatch: boolean
  delta?: DeltaSet
  version?: number
}

const DEFAULT_DRILLING: DrillingPlanInput = {
  name: '',
  productId: '',
  weavingModeId: '',
  weavingModeLabel: '',
  standardHoles: '',
  fileUrl: '',
  fileExtension: 'pdf',
}

export function useDrillingActionDialogState(currentRow: DrillingPlan | null | undefined, open: boolean) {
  const { data: products = [] } = useGetProducts({ mode: 'options' })
  const { data: weavingModes = [], isLoading: isWeavingModesLoading, isError: isWeavingModesError } = useQuery({
    queryKey: ENGINEERING_DB_WEAVING_MODES_QUERY_KEY,
    queryFn: () => weavingModeService.getWeavingModes(),
  })

  const isEdit = !!currentRow
  const initialFormData = useMemo<DrillingFormState>(() => {
    if (currentRow) {
      return currentRow
    }

    return {
      ...DEFAULT_DRILLING,
    }
  }, [currentRow])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const availableWeavingModes = useMemo(() => {
    return weavingModes.filter((item) => item.active || item.id === currentRow?.weavingModeId)
  }, [currentRow?.weavingModeId, weavingModes])

  const noWeavingModesAvailable = !isWeavingModesLoading && !isWeavingModesError && availableWeavingModes.length === 0

  const weavingModeItems = useMemo(() => {
    return availableWeavingModes.map((item) => ({
      label: item.label,
      value: item.id,
    }))
  }, [availableWeavingModes])

  const weavingModeMap = useMemo(() => {
    return new Map(availableWeavingModes.map((item) => [item.id, item.label]))
  }, [availableWeavingModes])

  const setFormData = useCallback((updater: DrillingFormUpdater) => {
    if (typeof updater === 'function') {
      const next = updater(formData)
      Object.assign(formData, next)
      return
    }

    Object.assign(formData, updater)
  }, [formData])

  const updateField = useCallback(<K extends keyof DrillingFormState>(field: K, value: DrillingFormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [setFormData])

  const handleWeavingModeChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      weavingModeId: value,
      weavingModeLabel: weavingModeMap.get(value) || '',
    }))
  }, [setFormData, weavingModeMap])

  const buildSaveParams = useCallback(async (): Promise<DrillingActionDialogSaveParams | null> => {
    if (isWeavingModesError) {
      toast.error('编织方式主数据加载失败，请稍后重试')
      return null
    }

    if (noWeavingModesAvailable) {
      toast.error('当前没有可用的编织方式，请先到工程主数据中维护')
      return null
    }

    const parsed = drillingPlanInputSchema.safeParse(formData)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '请填写钻孔方案必填项')
      return null
    }

    const payload = parsed.data
    if (isEdit && currentRow) {
      const delta = tracker.commit()
      if (Object.keys(delta).length === 0) {
        return {
          data: payload,
          isPatch: true,
          delta,
          version: currentRow.version,
        }
      }

      return {
        data: payload,
        isPatch: true,
        delta,
        version: currentRow.version,
      }
    }

    return {
      data: payload,
      isPatch: false,
    }
  }, [currentRow, formData, isEdit, isWeavingModesError, noWeavingModesAvailable, tracker])

  return {
    products,
    formData,
    isEdit,
    isDirty,
    updateField,
    handleWeavingModeChange,
    buildSaveParams,
    weavingModeItems,
    isWeavingModesLoading,
    isWeavingModesError,
    noWeavingModesAvailable,
  }
}

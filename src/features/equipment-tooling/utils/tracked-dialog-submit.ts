import { type DeltaSet } from '@/lib/delta/types'

interface PrepareTrackedDialogSubmitParams<TValues extends object> {
  values: TValues
  deltaProxy: TValues
  commit: () => DeltaSet
  isEdit: boolean
}

export function prepareTrackedDialogSubmit<TValues extends object>({
  values,
  deltaProxy,
  commit,
  isEdit,
}: PrepareTrackedDialogSubmitParams<TValues>) {
  Object.assign(deltaProxy, values)
  const delta = commit()
  const isDirty = Object.keys(delta).length > 0

  return {
    delta,
    isDirty,
    patchDelta: isEdit ? delta : undefined,
  }
}

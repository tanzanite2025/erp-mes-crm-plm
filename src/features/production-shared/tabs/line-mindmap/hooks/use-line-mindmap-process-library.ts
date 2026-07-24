import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ProductionProcessStep } from '../../../data/production-process'
import { productionResourceQueryKeys } from '../../../data/production-resource-query-keys'
import { productionProcessesService } from '../../../services/production-processes-service'
import { productionResourceSync } from '../../../services/production-resource-sync'

function isStructuredValue(value: unknown): boolean {
  return value !== null && typeof value === 'object'
}

function shouldInvalidateAfterProcessSave(
  step: ProductionProcessStep
): boolean {
  return Object.values(step).some((value) => isStructuredValue(value))
}

function sortProcesses(
  processes: ProductionProcessStep[]
): ProductionProcessStep[] {
  return [...processes].sort((left, right) => {
    const sortDiff = (left.sortOrder || 0) - (right.sortOrder || 0)
    if (sortDiff !== 0) {
      return sortDiff
    }

    return left.name.localeCompare(right.name)
  })
}

export function useLineMindmapProcessLibrary() {
  const queryClient = useQueryClient()
  const level3Name = 'L3'

  const setConfirmedProcesses = (
    updater: (current: ProductionProcessStep[]) => ProductionProcessStep[]
  ) => {
    queryClient.setQueryData<ProductionProcessStep[]>(
      productionResourceQueryKeys.processes(),
      (current) => updater(current ?? [])
    )
  }

  const saveProcess = async (step: ProductionProcessStep) => {
    const isUpdate = Boolean(step.id)
    const saved = await productionProcessesService.saveStep(step)
    const shouldInvalidate = shouldInvalidateAfterProcessSave(saved)

    setConfirmedProcesses((current) => {
      const existingIndex = current.findIndex(
        (process) => process.id === saved.id
      )
      if (existingIndex === -1) {
        return sortProcesses([...current, saved])
      }

      const next = [...current]
      next[existingIndex] = saved
      return sortProcesses(next)
    })

    productionResourceSync.emitProcessesUpdated({
      invalidate: shouldInvalidate,
    })
    toast.success(isUpdate ? `${level3Name}已更新` : `${level3Name}已创建`)
    return saved
  }

  const deleteProcess = async (process: ProductionProcessStep) => {
    await productionProcessesService.deleteStep(process.id)
    setConfirmedProcesses((current) =>
      current.filter((currentProcess) => currentProcess.id !== process.id)
    )
    productionResourceSync.emitProcessesUpdated({ invalidate: false })
    toast.success(`已删除${level3Name}：${process.name}`)
  }

  return {
    deleteProcess,
    saveProcess,
  }
}

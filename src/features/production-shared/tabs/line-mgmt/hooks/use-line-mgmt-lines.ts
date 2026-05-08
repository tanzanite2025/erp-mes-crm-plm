import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type DeltaSet } from '@/lib/delta/types'
import { failLoudly } from '@/lib/safe-catch'
import type { ProductionLine } from '../../../data/production-line'
import { productionResourceQueryKeys } from '../../../data/production-resource-query-keys'
import { useProductionLinesQuery } from '../../../hooks/use-production-resources'
import { productionLinesService } from '../../../services/production-lines-service'
import { productionResourceSync } from '../../../services/production-resource-sync'

export type LineMutationPayload =
  | { type: 'CREATE'; data: ProductionLine }
  | { type: 'UPDATE'; id: string; delta: DeltaSet; version: number }

interface PendingUpdateEntry {
  delta: DeltaSet
  id: string
}

function isStructuredValue(value: unknown): boolean {
  return value !== null && typeof value === 'object'
}

function isTopologyAuthForbidden(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return /topology authorization code is invalid/i.test(error.message) || /^UNAUTHORIZED$/i.test(error.message)
}

function isComplexLineDeltaEntry(path: string, value: DeltaSet[string]): boolean {
  return path.includes('.') || isStructuredValue(value.o) || isStructuredValue(value.n)
}

function canApplyOptimisticDelta(delta: DeltaSet): boolean {
  return Object.entries(delta).every(([path, value]) => !isComplexLineDeltaEntry(path, value))
}

function shouldInvalidateAfterUpdate(delta: DeltaSet): boolean {
  return Object.entries(delta).some(([path, value]) => isComplexLineDeltaEntry(path, value))
}

function createOptimisticLine(line: ProductionLine): ProductionLine {
  const now = new Date().toISOString()

  return {
    ...line,
    id: `temp-${Date.now()}`,
    segments: line.segments ?? [],
    version: line.version ?? 0,
    createdAt: line.createdAt || now,
    updatedAt: line.updatedAt || now,
  }
}

function applyOptimisticDelta(line: ProductionLine, delta: DeltaSet): ProductionLine {
  const updated: ProductionLine & Record<string, unknown> = {
    ...line,
    updatedAt: new Date().toISOString(),
  }

  Object.entries(delta).forEach(([path, item]) => {
    updated[path] = item.n
  })

  return updated
}

function applyLineOverlays(
  queryLines: ProductionLine[],
  pendingCreates: ProductionLine[],
  pendingUpdates: PendingUpdateEntry[],
  pendingDeletes: string[]
): ProductionLine[] {
  const pendingUpdateMap = new Map(pendingUpdates.map((entry) => [entry.id, entry.delta]))

  const confirmedLines = queryLines
    .filter((line) => !pendingDeletes.includes(line.id))
    .map((line) => {
      const delta = pendingUpdateMap.get(line.id)
      if (!delta || !canApplyOptimisticDelta(delta)) {
        return line
      }

      return applyOptimisticDelta(line, delta)
    })

  return [...pendingCreates, ...confirmedLines]
}

export function useLineMgmtLines() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: queryLines, isLoading, error } = useProductionLinesQuery()
  const [pendingCreates, setPendingCreates] = useState<ProductionLine[]>([])
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdateEntry[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([])

  const lines = useMemo(
    () => applyLineOverlays(queryLines ?? [], pendingCreates, pendingUpdates, pendingDeletes),
    [queryLines, pendingCreates, pendingUpdates, pendingDeletes]
  )

  const setConfirmedLines = (updater: (current: ProductionLine[]) => ProductionLine[]) => {
    queryClient.setQueryData<ProductionLine[]>(productionResourceQueryKeys.lines(), (current) => updater(current ?? []))
  }

  const handleUpdateLine = async (payload: LineMutationPayload, authCode?: string, rethrowError = false) => {
    const isUpdate = payload.type === 'UPDATE'
    let optimisticTempId: string | null = null
    let shouldInvalidateOnSuccess = false

    if (isUpdate) {
      const { id, delta } = payload
      shouldInvalidateOnSuccess = shouldInvalidateAfterUpdate(delta)
      if (canApplyOptimisticDelta(delta)) {
        setPendingUpdates((prev) => [...prev.filter((entry) => entry.id !== id), { id, delta }])
      }
    } else {
      const { data: line } = payload
      const optimisticLine = createOptimisticLine(line)
      optimisticTempId = optimisticLine.id
      setPendingCreates((prev) => [optimisticLine, ...prev])
    }

    try {
      if (isUpdate) {
        const { id, delta, version } = payload
        const saved = await productionLinesService.patchLine(id, delta, version, authCode)
        setConfirmedLines((current) => current.map((line) => (line.id === id ? saved : line)))
        setPendingUpdates((prev) => prev.filter((entry) => entry.id !== id))
      } else {
        const { data: line } = payload
        const lineToSave = { ...line, id: '' }
        const saved = await productionLinesService.saveLine(lineToSave, authCode)
        setPendingCreates((prev) => prev.filter((currentLine) => currentLine.id !== optimisticTempId))
        setConfirmedLines((current) => [saved, ...current])
      }

      // Complex nested payloads may be normalized further on the server, so they still revalidate after cache patch.
      productionResourceSync.emitLinesUpdated({ invalidate: shouldInvalidateOnSuccess })
      toast.success(t(isUpdate ? 'orgPersonnel.lineMgmt.list.updateSuccess' : 'orgPersonnel.lineMgmt.list.addSuccess'))
    } catch (error: unknown) {
      if (isUpdate) {
        const { id } = payload
        setPendingUpdates((prev) => prev.filter((entry) => entry.id !== id))
      } else {
        setPendingCreates((prev) => prev.filter((currentLine) => currentLine.id !== optimisticTempId))
      }

      if (error && typeof error === 'object' && 'status' in error && Number(error.status) === 409) {
        toast.error(t('orgPersonnel.lineMgmt.toasts.saveConflict'))
      } else if (error && typeof error === 'object' && 'status' in error && Number(error.status) === 403) {
        toast.error(
          isTopologyAuthForbidden(error)
            ? t('orgPersonnel.lineMgmt.toasts.saveForbiddenAuthCode')
            : t('orgPersonnel.lineMgmt.toasts.saveForbiddenPermission')
        )
      } else {
        toast.error(t('orgPersonnel.lineMgmt.toasts.saveError'))
      }

      if (rethrowError) {
        throw error
      }
    }
  }

  const handleDeleteLine = async (id: string) => {
    setPendingDeletes((prev) => [...prev, id])

    try {
      await productionLinesService.deleteLine(id)
      setConfirmedLines((current) => current.filter((line) => line.id !== id))
      setPendingDeletes((prev) => prev.filter((currentId) => currentId !== id))
      productionResourceSync.emitLinesUpdated({ invalidate: false })
    } catch (error) {
      setPendingDeletes((prev) => prev.filter((currentId) => currentId !== id))
      failLoudly(error, 'useLineMgmtLines.handleDeleteLine')
    }
  }

  return {
    deleteLine: handleDeleteLine,
    error,
    isLoading,
    lines,
    updateLine: (payload: LineMutationPayload, authCode?: string) => handleUpdateLine(payload, authCode),
    updateLineStrict: (payload: LineMutationPayload, authCode?: string) => handleUpdateLine(payload, authCode, true),
  }
}

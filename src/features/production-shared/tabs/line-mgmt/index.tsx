import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ForbiddenState } from '@/components/forbidden-state'
import { LineList } from './components/line-list'
import type { ProductionLine } from '../../data/production-line'
import { productionResourceQueryKeys } from '../../data/production-resource-query-keys'
import { useProductionLinesQuery } from '../../hooks/use-production-resources'
import { productionLinesService } from '../../services/production-lines-service'
import { productionResourceSync } from '../../services/production-resource-sync'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { failLoudly } from '@/lib/safe-catch'
import { type DeltaSet } from '@/lib/delta/types'

function isTopologyAuthForbidden(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return /topology authorization code is invalid/i.test(error.message) || /^UNAUTHORIZED$/i.test(error.message)
}

function canApplyOptimisticDelta(delta: DeltaSet): boolean {
  return Object.keys(delta).every((path) => !path.includes('.'))
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

interface PendingUpdateEntry {
  delta: DeltaSet
  id: string
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

export function LineMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: queryLines, isLoading, error } = useProductionLinesQuery()
  const [pendingCreates, setPendingCreates] = useState<ProductionLine[]>([])
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdateEntry[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([])
  const displayedLines = useMemo(
    () => applyLineOverlays(queryLines ?? [], pendingCreates, pendingUpdates, pendingDeletes),
    [queryLines, pendingCreates, pendingUpdates, pendingDeletes]
  )

  const setConfirmedLines = (updater: (current: ProductionLine[]) => ProductionLine[]) => {
    queryClient.setQueryData<ProductionLine[]>(productionResourceQueryKeys.lines(), (current) => updater(current ?? []))
  }

  const handleUpdateLine = async (
    payload: { type: 'CREATE'; data: ProductionLine } | { type: 'UPDATE'; id: string; delta: DeltaSet; version: number },
    authCode?: string
  ) => {
    const isUpdate = payload.type === 'UPDATE'
    let optimisticTempId: string | null = null

    if (isUpdate) {
      const { id, delta } = payload
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
        setConfirmedLines((current) => current.map((line) => line.id === id ? saved : line))
        setPendingUpdates((prev) => prev.filter((entry) => entry.id !== id))
      } else {
        const { data: line } = payload
        const lineToSave = { ...line, id: '' } // 触发后端生成 UUID
        const saved = await productionLinesService.saveLine(lineToSave, authCode)
        setPendingCreates((prev) => prev.filter((currentLine) => currentLine.id !== optimisticTempId))
        setConfirmedLines((current) => [saved, ...current])
      }

      productionResourceSync.emitLinesUpdated()
      toast.success(t('orgPersonnel.lineMgmt.list.updateSuccess'))
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
    }
  }

  const handleDeleteLine = async (id: string) => {
    setPendingDeletes((prev) => [...prev, id])

    try {
      await productionLinesService.deleteLine(id)
      setConfirmedLines((current) => current.filter((line) => line.id !== id))
      setPendingDeletes((prev) => prev.filter((currentId) => currentId !== id))
      productionResourceSync.emitLinesUpdated()
    } catch (error) {
      setPendingDeletes((prev) => prev.filter((currentId) => currentId !== id))
      failLoudly(error, 'LineMgmt.handleDeleteLine')
    }
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading && displayedLines.length === 0) {
    return <div className="p-10 text-center text-muted-foreground animate-pulse">{t('orgPersonnel.lineMgmt.toasts.loading')}</div>
  }

  return (
    <LineList 
      lines={displayedLines}
      onUpdate={handleUpdateLine}
      onDelete={handleDeleteLine}
    />
  )
}

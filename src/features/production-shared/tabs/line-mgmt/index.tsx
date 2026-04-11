import { useCallback, useEffect, useState } from 'react'
import { ForbiddenState } from '@/components/forbidden-state'
import { LineList } from './components/line-list'
import type { ProductionLine } from '../../data/production-line'
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

export function LineMgmt() {
  const { t } = useLanguage()
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      setError(null)
      const data = await productionLinesService.getLines()
      setLines(data || [])
    } catch (loadError) {
      setError(loadError)
      toast.error(t('orgPersonnel.lineMgmt.toasts.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void loadData()
    }, 0)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [loadData])

  const handleUpdateLine = async (
    payload: { type: 'CREATE'; data: ProductionLine } | { type: 'UPDATE'; id: string; delta: DeltaSet; version: number }, 
    authCode?: string
  ) => {
    const isUpdate = payload.type === 'UPDATE'
    
    // 乐观 UI 更新
    if (isUpdate) {
      const { id, delta } = payload
      setLines(prev => prev.map(l => {
        if (l.id !== id) return l
        // 根据 Delta 进行局部状态回写 (乐观更新)
        const updated: ProductionLine & Record<string, unknown> = { ...l }
        Object.entries(delta).forEach(([path, item]) => {
          // 此处暂不处理深度路径，仅处理一级字段（产线主表基本是一级）
          if (!path.includes('.')) {
            updated[path] = item.n
          }
        })
        return updated
      }))
    } else {
      const { data: line } = payload
      setLines(prev => {
        const tempId = `temp-${Date.now()}`
        const newLine = { ...line, id: tempId }
        return [newLine, ...prev]
      })
    }
    
    try {
      if (isUpdate) {
        const { id, delta, version } = payload
        const saved = await productionLinesService.patchLine(id, delta, version, authCode)
        setLines(prev => prev.map(l => l.id === id ? saved : l))
      } else {
        const { data: line } = payload
        const lineToSave = { ...line, id: '' } // 触发后端生成 UUID
        const saved = await productionLinesService.saveLine(lineToSave, authCode)
        // 同步服务端生成的真实 ID
        setLines(prev => prev.map(l => l.name === line.name && l.id.startsWith('temp-') ? saved : l))
      }
      
      productionResourceSync.emitLinesUpdated()
      toast.success(t('orgPersonnel.lineMgmt.list.updateSuccess'))
      // 关键加固：保存成功后延迟全量刷新一次数据，确保嵌套关系同步
      await loadData()
    } catch (error: unknown) {
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
      await loadData() // 统一失败回滚
    }
  }

  const handleDeleteLine = async (id: string) => {
    try {
      await productionLinesService.deleteLine(id)
      productionResourceSync.emitLinesUpdated()
      await loadData()
    } catch (error) {
      failLoudly(error, 'LineMgmt.handleDeleteLine')
    }
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading && lines.length === 0) {
    return <div className="p-10 text-center text-muted-foreground animate-pulse">{t('orgPersonnel.lineMgmt.toasts.loading')}</div>
  }

  return (
    <LineList 
      lines={lines}
      onUpdate={handleUpdateLine}
      onDelete={handleDeleteLine}
    />
  )
}

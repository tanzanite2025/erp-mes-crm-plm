import { useCallback, useEffect, useState } from 'react'
import { ForbiddenState } from '@/components/forbidden-state'
import { LineList } from './components/line-list'
import { type ProductionLine } from './types'
import { productionResourceService } from '../../services/production-resource-service'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { failLoudly } from '@/lib/safe-catch'

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
      const data = await productionResourceService.getLines()
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

  const handleUpdateLine = async (line: ProductionLine, authCode?: string) => {
    // 乐观 UI 更新
    setLines(prev => {
      // 这里的逻辑必须非常严谨：
      // 1. 如果传入的 line 已经有正式 ID (不是 temp-)，且列表中存在该 ID，则执行替换。
      // 2. 如果列表中存在一个临时 ID 的卡片，其特征匹配（如名称相同），而传入的 line 是正式 ID，也应执行替换。
      const index = prev.findIndex(l => l.id === line.id || (line.id && !line.id.startsWith('temp-') && l.name === line.name && l.id.startsWith('temp-')))
      
      if (index !== -1) {
        const updated = [...prev]
        updated[index] = { ...line }
        return updated
      } else {
        // 全新产线
        const tempId = `temp-${Date.now()}`
        const newLine = { ...line, id: tempId }
        return [newLine, ...prev]
      }
    })
    
    try {
      // 发送到后端前，如果是临时 ID 则置空以触发服务器 UUID 生成
      const lineToSave = { 
        ...line, 
        id: (line.id && line.id.startsWith('temp-')) ? '' : (line.id || '') 
      }
      const saved = await productionResourceService.saveLine(lineToSave, authCode)
      // 如果保存成功且原本是临时 ID，我们需要同步服务端生成的真实 ID
      if (line.id?.startsWith('temp-')) {
        setLines(prev => prev.map(l => l.id === line.id ? saved : l))
      } else {
        // 如果是更新操作，我们要同步最新的版本号 (Version) 以维持乐观锁链
        setLines(prev => prev.map(l => l.id === line.id ? saved : l))
      }
      
      // 关键加固：保存成功后强制全量刷新一次数据，防止注销后的数据残影
      toast.success(t('orgPersonnel.lineMgmt.list.updateSuccess'))
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
      await productionResourceService.deleteLine(id)
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

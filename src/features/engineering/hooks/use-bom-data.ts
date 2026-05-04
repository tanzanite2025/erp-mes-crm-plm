'use client'

import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isConflictError } from '@/lib/handle-server-error'
import { failLoudly } from '@/lib/safe-catch'
import { type SaveBOMInput } from '../mutation-types'
import { useBOMImportExport } from './use-bom-import-export'
import { useBOMReadData, type BOMReadDataResource } from './use-bom-read-data'
import { useBOMWriteActions } from './use-bom-write-actions'

interface BOMDataResult {
  readResource: BOMReadDataResource
  saveBOM: (params: { data: SaveBOMInput }) => Promise<boolean>
  deleteBOM: (id: string) => Promise<boolean>
  downloadTemplate: () => Promise<void>
  parseExcel: ReturnType<typeof useBOMImportExport>['parseExcel']
}

export function useBOMData(): BOMDataResult {
  const { t } = useLanguage()
  const readResource = useBOMReadData()
  const { saveBOM: persistBOM, deleteBOM: removeBOM } = useBOMWriteActions()
  const { downloadTemplate, parseExcel } = useBOMImportExport({
    products: readResource.status === 'ready' ? readResource.products : [],
  })

  const saveBOM = async (params: { data: SaveBOMInput }) => {
    try {
      await persistBOM(params)
      toast.success(t('engineering.bomArchive.toasts.saveSuccess'))
      return true
    } catch (error) {
      if (isConflictError(error)) {
        toast.error(t('engineering.bomArchive.toasts.conflict'))
        return false
      }

      toast.error(t('engineering.bomArchive.toasts.saveFailed'))
      return false
    }
  }

  const deleteBOM = async (id: string) => {
    try {
      await removeBOM(id)
      toast.success(t('engineering.bomArchive.toasts.deleteSuccess'))
      return true
    } catch (error) {
      failLoudly(error, 'useBOMData.deleteBOM')
      return false
    }
  }

  return {
    readResource,
    saveBOM,
    deleteBOM,
    downloadTemplate,
    parseExcel,
  }
}


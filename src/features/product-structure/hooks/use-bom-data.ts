'use client'

import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isConflictError } from '@/lib/handle-server-error'
import { failLoudly } from '@/lib/safe-catch'
import { type BOM } from '../data/schema'
import { type SaveBOMInput } from '../mutation-types'
import { useBOMImportExport } from './use-bom-import-export'
import { useBOMReadData, type BOMReadDataResource } from './use-bom-read-data'
import { useBOMWriteActions } from './use-bom-write-actions'

interface BOMDataResult {
  readResource: BOMReadDataResource
  saveBOM: (params: { data: SaveBOMInput }) => Promise<BOM | null>
  deleteBOM: (id: string) => Promise<boolean>
  promoteBOM: (id: string, status: string, expectedVersion?: number) => Promise<boolean>
  deriveMBOM: (ebomId: string, input: { description?: string; revisionNo?: string; changeOrderNo?: string }) => Promise<boolean>
  downloadTemplate: () => Promise<void>
  parseExcel: ReturnType<typeof useBOMImportExport>['parseExcel']
}

export function useBOMData(filters?: { productId?: string; status?: string; bomType?: string }): BOMDataResult {
  const { t } = useLanguage()
  const readResource = useBOMReadData(filters)
  const { 
    saveBOM: persistBOM, 
    deleteBOM: removeBOM, 
    promoteBOM: moveBOM,
    deriveMBOM: deriveAction
  } = useBOMWriteActions()
  const { downloadTemplate, parseExcel } = useBOMImportExport({
    products: readResource.status === 'ready' ? readResource.products : [],
    productDisplayLabelMap: readResource.status === 'ready' ? readResource.productDisplayLabelMap : new Map<string, string>(),
    sections: readResource.status === 'ready' ? readResource.sections : [],
  })

  const saveBOM = async (params: { data: SaveBOMInput }) => {
    try {
      const saved = await persistBOM(params)
      toast.success(t('engineering.bomArchive.toasts.saveSuccess'))
      return saved
    } catch (error) {
      if (isConflictError(error)) {
        toast.error(t('engineering.bomArchive.toasts.conflict'))
        return null
      }

      toast.error(t('engineering.bomArchive.toasts.saveFailed'))
      return null
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

  const promoteBOM = async (id: string, status: string) => {
    try {
      await moveBOM({ id, status })
      toast.success(t('engineering.bomArchive.toasts.saveSuccess'))
      return true
    } catch (error) {
      failLoudly(error, 'useBOMData.promoteBOM')
      return false
    }
  }

  const deriveMBOM = async (ebomId: string, input: { description?: string; revisionNo?: string; changeOrderNo?: string }) => {
    try {
      await deriveAction({ ebomId, input })
      return true
    } catch (error) {
      failLoudly(error, 'useBOMData.deriveMBOM')
      return false
    }
  }

  return {
    readResource,
    saveBOM,
    deleteBOM,
    promoteBOM,
    deriveMBOM,
    downloadTemplate,
    parseExcel,
  }
}


'use client'

import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isConflictError } from '@/lib/handle-server-error'
import { type DeltaSet } from '@/lib/delta/types'
import { failLoudly } from '@/lib/safe-catch'
import { type SaveBOMInput } from '../mutation-types'
import { useBOMImportExport } from './use-bom-import-export'
import { useBOMReadData } from './use-bom-read-data'
import { useBOMWriteActions } from './use-bom-write-actions'

export function useBOMData() {
  const { t } = useLanguage()
  const {
    data,
    products,
    materials,
    isLoading,
    loadError,
  } = useBOMReadData()
  const { saveBOM: persistBOM, deleteBOM: removeBOM } = useBOMWriteActions()
  const { downloadTemplate, parseExcel } = useBOMImportExport({ products })

  const saveBOM = async (params: { data: SaveBOMInput; isPatch?: boolean; delta?: DeltaSet }) => {
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
    data,
    products,
    materials,
    isLoading,
    loadError,
    saveBOM,
    deleteBOM,
    downloadTemplate,
    parseExcel,
  }
}


import { useState, type ChangeEvent } from 'react'
import { type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { type Material } from '../data/schema'
import { MaterialMaintenanceService } from '../services/material-maintenance-service'
import { MaterialExcelService } from '../services/excel-service'
import { isConflictImportError } from '../utils/material-mgmt-utils'

const logger = createLogger('useMaterialMgmtActions')

interface UseMaterialMgmtActionsParams {
  currentCategoryLabel: string
  filteredMaterials: Material[]
  queryClient: QueryClient
  onDelete: (id: string) => void
}

export function useMaterialMgmtActions({
  currentCategoryLabel,
  filteredMaterials,
  queryClient,
  onDelete,
}: UseMaterialMgmtActionsParams) {
  const { locale, t } = useLanguage()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const handleAdd = () => {
    setEditingMaterial(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm(t('materialArchive.actions.deleteConfirm'))) {
      onDelete(id)
    }
  }

  const handleExport = async () => {
    const loadingId = toast.loading(
      t('materialArchive.actions.exportPreparing', { category: currentCategoryLabel })
    )

    try {
      await MaterialExcelService.exportMaterials(filteredMaterials, currentCategoryLabel, locale)
      toast.success(t('materialArchive.actions.exportSuccess'), { id: loadingId })
    } catch (error) {
      logger.error('Export error', error)
      toast.error(t('materialArchive.actions.exportFailed'), { id: loadingId })
    }
  }

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const loadingId = toast.loading(t('materialArchive.actions.importParsing'))

    try {
      const { materials: parsedMaterials, globalSnapshotVersion } =
        await MaterialExcelService.parseMaterialExcel(file, locale)

      if (parsedMaterials.length === 0) {
        toast.error(t('materialArchive.actions.importNoValidData'), { id: loadingId })
        return
      }

      await MaterialMaintenanceService.saveMaterials(parsedMaterials, {
        globalVersion: globalSnapshotVersion?.toString(),
      })
      queryClient.invalidateQueries({ queryKey: ['material-archive'] })
      toast.success(
        t('materialArchive.actions.importSuccess', { count: parsedMaterials.length }),
        { id: loadingId }
      )
    } catch (error) {
      logger.error('Import error', error)
      const message =
        error instanceof Error ? error.message : t('materialArchive.actions.parseFailed')

      if (isConflictImportError(message)) {
        toast.error(t('materialArchive.actions.importConflict'), { id: loadingId, duration: 5000 })
      } else {
        toast.error(message, { id: loadingId })
      }
    } finally {
      e.target.value = ''
    }
  }

  return {
    isDialogOpen,
    setIsDialogOpen,
    editingMaterial,
    handleAdd,
    handleEdit,
    handleDelete,
    handleExport,
    handleImport,
  }
}

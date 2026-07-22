import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { getMenuPermissionForPath } from '@/features/authz/data/permission-catalog'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { type Material } from '@/features/material-archive/data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY } from '@/features/material-archive/query-keys'
import { MaterialMaintenanceService } from '@/features/material-archive/services/material-maintenance-service'
import { type PurchaseOrderLine } from '../data/schema'

const MATERIAL_ARCHIVE_PATH = '/materials'
const MATERIAL_ARCHIVE_MENU_PERMISSION_ID =
  getMenuPermissionForPath(MATERIAL_ARCHIVE_PATH)
const MATERIAL_ARCHIVE_WRITE_PERMISSION_ID = 'action_material_update'

type UpdatePurchaseLine = (
  index: number,
  field: keyof PurchaseOrderLine,
  value: PurchaseOrderLine[keyof PurchaseOrderLine],
  extraData?: Partial<PurchaseOrderLine>
) => void

interface PurchaseOrderMaterialShortcutsOptions {
  lines: PurchaseOrderLine[]
  updateLine: UpdatePurchaseLine
}

function buildPurchaseLinePatchFromMaterial(
  material: Material,
  currentLine?: PurchaseOrderLine
): Partial<PurchaseOrderLine> {
  return {
    materialId: material.id,
    materialCode: material.code,
    specification: material.spec || '',
    uom: material.uom,
    price: currentLine?.price || material.costPrice || 0,
  }
}

export function usePurchaseOrderMaterialShortcuts({
  lines,
  updateLine,
}: PurchaseOrderMaterialShortcutsOptions) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { allowsAction, allowsPermission } = usePermissionActions()
  const [materialCreateTargetLineIndex, setMaterialCreateTargetLineIndex] =
    useState<number | null>(null)

  const canMaintainMaterials = allowsAction(MATERIAL_ARCHIVE_WRITE_PERMISSION_ID)
  const canOpenMaterialArchive =
    canMaintainMaterials || allowsPermission(MATERIAL_ARCHIVE_MENU_PERMISSION_ID)

  const openMaterialArchive = useCallback(() => {
    if (!canOpenMaterialArchive) return
    window.open(MATERIAL_ARCHIVE_PATH, '_blank', 'noopener,noreferrer')
  }, [canOpenMaterialArchive])

  const openMaterialCreateDialog = useCallback(
    (lineIndex: number) => {
      if (!canMaintainMaterials || lineIndex < 0) return
      setMaterialCreateTargetLineIndex(lineIndex)
    },
    [canMaintainMaterials]
  )

  const handleMaterialCreateDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setMaterialCreateTargetLineIndex(null)
      }
    },
    []
  )

  const fillPurchaseLineWithMaterial = useCallback(
    (material: Material, lineIndex: number) => {
      updateLine(lineIndex, 'materialName', material.name, {
        ...buildPurchaseLinePatchFromMaterial(material, lines[lineIndex]),
      })
    },
    [lines, updateLine]
  )

  const saveMaterialAndFillPurchaseLine = useCallback(
    async (data: Material, isPatch?: boolean, delta?: DeltaSet) => {
      if (!canMaintainMaterials || isPatch || delta) {
        return
      }

      const savedMaterial = await MaterialMaintenanceService.saveMaterial(data)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['material-archive'] }),
        queryClient.invalidateQueries({ queryKey: MATERIAL_OPTIONS_QUERY_KEY }),
      ])

      if (materialCreateTargetLineIndex !== null) {
        fillPurchaseLineWithMaterial(savedMaterial, materialCreateTargetLineIndex)
      }
      toast.success(t('purchase.orders.linesEditor.materialCreatedAndSelected'))
    },
    [
      canMaintainMaterials,
      fillPurchaseLineWithMaterial,
      materialCreateTargetLineIndex,
      queryClient,
      t,
    ]
  )

  return {
    canMaintainMaterials,
    canOpenMaterialArchive,
    isMaterialCreateDialogOpen: materialCreateTargetLineIndex !== null,
    openMaterialArchive,
    openMaterialCreateDialog,
    handleMaterialCreateDialogOpenChange,
    saveMaterialAndFillPurchaseLine,
  }
}

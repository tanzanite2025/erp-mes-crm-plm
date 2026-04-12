import { useCallback, useMemo } from 'react'
import { type Unit } from '@/features/basic-settings/services/unit-service'
import { type MaterialOption } from '@/features/material-archive/data/schema'
import { type PurchaseOrderLine } from '../data/schema'

type PurchaseOrderLineFieldValue = PurchaseOrderLine[keyof PurchaseOrderLine]

interface PurchaseOrderLinesEditorViewModelOptions {
  units: Unit[]
  materials: MaterialOption[]
  lines: PurchaseOrderLine[]
  onLineChange: (
    index: number,
    field: keyof PurchaseOrderLine,
    value: PurchaseOrderLineFieldValue,
    extraData?: Partial<PurchaseOrderLine>
  ) => void
}

interface PurchaseOrderLinesEditorViewModel {
  materialById: Map<string, MaterialOption>
  materialOptions: {
    label: string
    value: string
    secondaryLabel?: string
    tertiaryLabel?: string
    keywords?: string
  }[]
  unitOptions: {
    label: string
    value: string
    secondaryLabel?: string
    tertiaryLabel?: string
    keywords?: string
  }[]
  handleMaterialSelect: (index: number, materialId: string) => void
}

export function usePurchaseOrderLinesEditorViewModel({
  units,
  materials,
  lines,
  onLineChange,
}: PurchaseOrderLinesEditorViewModelOptions): PurchaseOrderLinesEditorViewModel {
  const materialById = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials]
  )

  const materialOptions = useMemo(
    () =>
      materials.map((material) => ({
        label: material.name,
        value: material.id,
        secondaryLabel: material.spec,
        tertiaryLabel: material.code,
        keywords: `${material.name} ${material.code} ${material.spec}`,
      })),
    [materials]
  )

  const unitOptions = useMemo(
    () =>
      units.map((unit) => ({
        label: unit.name,
        value: unit.name,
        secondaryLabel: unit.category,
        tertiaryLabel: unit.code,
        keywords: `${unit.name} ${unit.code} ${unit.category}`,
      })),
    [units]
  )

  const handleMaterialSelect = useCallback(
    (index: number, materialId: string) => {
      const material = materialById.get(materialId)
      if (!material) {
        onLineChange(index, 'materialName', '')
        return
      }

      onLineChange(index, 'materialName', material.name, {
        materialId: material.id,
        materialCode: material.code,
        specification: material.spec || '',
        uom: material.uom,
        price: lines[index]?.price || material.costPrice || 0,
      })
    },
    [lines, materialById, onLineChange]
  )

  return {
    materialById,
    materialOptions,
    unitOptions,
    handleMaterialSelect,
  }
}

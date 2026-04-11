import { useEffect, useState } from 'react'
import { type Unit, unitService } from '@/features/basic-settings/services/unit-service'
import { type MaterialOption } from '@/features/material-archive/data/schema'
import { MaterialCoreService } from '@/features/material-archive/services/material-core-service'

export function usePurchaseOrderDialogResources(open: boolean) {
  const [units, setUnits] = useState<Unit[]>([])
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [isMetaLoading, setIsMetaLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const loadMetadata = async () => {
      setIsMetaLoading(true)
      try {
        const [unitList, materialList] = await Promise.all([
          unitService.getUnits(),
          MaterialCoreService.getMaterialOptions(),
        ])

        if (cancelled) return

        setUnits(unitList || [])
        setMaterials(materialList || [])
      } finally {
        if (!cancelled) {
          setIsMetaLoading(false)
        }
      }
    }

    void loadMetadata()

    return () => {
      cancelled = true
    }
  }, [open])

  return {
    units,
    materials,
    isMetaLoading,
  }
}

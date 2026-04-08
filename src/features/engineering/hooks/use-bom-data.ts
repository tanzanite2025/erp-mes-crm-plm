'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isConflictError } from '@/lib/handle-server-error'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { DictionaryCoreService } from '@/features/basic-settings/services/dictionary-core-service'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { MaterialMaintenanceService } from '../../material-archive/services/material-maintenance-service'
import { type Material } from '../../material-archive/data/schema'
import { type BOM, type Product } from '../data/schema'
import { bomService } from '../services/bom-service'
import { ExcelService } from '../services/excel-service'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMData')

export function useBOMData() {
  const { t } = useLanguage()
  const [data, setData] = useState<BOM[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [dictEntries, setDictEntries] = useState<unknown[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const categoryMap = useMemo(
    () => ({
      RAW_MATERIAL: t('engineering.bomArchive.category.RAW_MATERIAL'),
      AUXILIARY: t('engineering.bomArchive.category.AUXILIARY'),
      CONSUMABLE: t('engineering.bomArchive.category.CONSUMABLE'),
      CHEMICAL: t('engineering.bomArchive.category.CHEMICAL'),
      PACKAGING: t('engineering.bomArchive.category.PACKAGING'),
    }),
    [t]
  )

  const refreshAll = useCallback(async () => {
    setIsLoading(true)

    try {
      const [boms, loadedProducts, _, loadedMaterials] = await Promise.all([
        bomService.getBOMs(),
        ProductCoreService.getProducts(),
        DictionaryCoreService.init(),
        MaterialCoreService.getMaterialOptions(),
      ])

      setData(boms || [])
      setProducts(loadedProducts || [])
      setDictEntries(DictionaryCoreService.getEntries() || [])
      setMaterials(loadedMaterials || [])
    } catch (error) {
      logger.error('BOM data load error', error)
      toast.error(t('engineering.bomArchive.toasts.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  const persistData = useCallback(
    async (newDataOrId: BOM[] | string) => {
      if (typeof newDataOrId === 'string') {
        try {
          await bomService.deleteBOM(newDataOrId)
          await refreshAll()
          toast.success(t('engineering.bomArchive.toasts.deleteSuccess'))
        } catch (error) {
          failLoudly(error, 'useBOMData.persistData.delete')
        }
        return
      }

      await refreshAll()
    },
    [refreshAll, t]
  )

  const saveBOM = useCallback(
    async (bom: Partial<BOM>, isPatch?: boolean, delta?: any) => {
      try {
        if (isPatch && bom.id && delta) {
          await bomService.patchBOM(bom.id, delta, bom.version || 1)
        } else {
          await bomService.saveBOM(bom)
        }
        await refreshAll()
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
    },
    [refreshAll, t]
  )

  const deleteBOM = useCallback(
    async (id: string) => {
      try {
        await bomService.deleteBOM(id)
        await refreshAll()
        toast.success(t('engineering.bomArchive.toasts.deleteSuccess'))
        return true
      } catch (error) {
        failLoudly(error, 'useBOMData.deleteBOM')
        return false
      }
    },
    [refreshAll, t]
  )

  useEffect(() => {
    void refreshAll()

    const handleProductsUpdate = () => void refreshAll()
    const handleDictsUpdate = () => setDictEntries(DictionaryCoreService.getEntries() || [])
    const handleMaterialsUpdate = async () => {
      const loadedMaterials = await MaterialCoreService.getMaterialOptions()
      setMaterials(loadedMaterials || [])
    }

    window.addEventListener('xdfc_products_data_updated', handleProductsUpdate)
    window.addEventListener('xdfc_dictionary_updated', handleDictsUpdate)
    window.addEventListener('xdfc_materials_updated', handleMaterialsUpdate)

    return () => {
      window.removeEventListener('xdfc_products_data_updated', handleProductsUpdate)
      window.removeEventListener('xdfc_dictionary_updated', handleDictsUpdate)
      window.removeEventListener('xdfc_materials_updated', handleMaterialsUpdate)
    }
  }, [refreshAll])

  const downloadTemplate = async () => {
    const loadingId = toast.loading(t('engineering.bomArchive.toasts.downloadLoading'))

    try {
      const loadedMaterials = await MaterialCoreService.getMaterialOptions()
      await ExcelService.generateBOMTemplate(loadedMaterials || [], products, dictEntries)
      toast.success(t('engineering.bomArchive.toasts.downloadSuccess'), { id: loadingId })
    } catch (error) {
      logger.error('Template generation error', error)
      toast.error(t('engineering.bomArchive.toasts.downloadFailed'), { id: loadingId })
    }
  }

  const parseExcel = async (file: File) => {
    const loadingId = toast.loading(t('engineering.bomArchive.toasts.parseLoading'))

    try {
      const {
        items: parsedItems,
        productId: parsedProductId,
        materials: extractedMaterials,
      } = await ExcelService.parseBOMExcel(file)

      if (parsedItems.length === 0) {
        toast.error(t('engineering.bomArchive.toasts.parseNoValid'), { id: loadingId })
        return null
      }

      const { bomItemSchema } = await import('../data/schema')
      const validItems: Array<Partial<BOM['items'][number]>> = []
      const errors: string[] = []

      parsedItems.forEach((item, index) => {
        const result = bomItemSchema.safeParse(item)

        if (result.success) {
          validItems.push(item)
          return
        }

        const fieldErrors = result.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ')

        errors.push(`Row ${index + 2}: ${fieldErrors}`)
      })

      if (errors.length > 0) {
        logger.error('BOM import schema error', errors)
        toast.error(
          t('engineering.bomArchive.toasts.parseSchemaErrors', {
            count: errors.length,
          }),
          { id: loadingId }
        )
        return null
      }

      if (extractedMaterials && extractedMaterials.length > 0) {
        const sanitizedMaterials = extractedMaterials.filter(
          (material) => material.name && material.code && material.id
        )
        await MaterialMaintenanceService.saveMaterials(sanitizedMaterials)
      }

      const latestMaterials = (await MaterialCoreService.getMaterialOptions()) || []
      const processedItems = validItems.map((item) => {
        const material = latestMaterials.find((entry: Material) => entry.id === item.materialId)

        return {
          id: crypto.randomUUID(),
          section: item.section || t('engineering.bomArchive.category.defaultSection'),
          materialId: item.materialId || '',
          materialName: material?.name || '',
          materialSpec: material?.spec || '',
          unitPrice: item.unitPrice || 0,
          unit: item.unit || '',
          unitUsage: item.unitUsage || 0,
          wastagePercent: item.wastagePercent || 0,
          standardUsage: parseFloat(
            (((item.unitUsage || 0) * (1 + (item.wastagePercent || 0) / 100))).toFixed(6)
          ),
          materialType:
            material?.category && categoryMap[material.category as keyof typeof categoryMap]
              ? categoryMap[material.category as keyof typeof categoryMap]
              : t('engineering.bomArchive.category.defaultType'),
          supplyChannel: '',
        }
      })

      toast.success(
        t('engineering.bomArchive.toasts.parseSuccess', {
          count: processedItems.length,
        }),
        { id: loadingId }
      )

      return { items: processedItems, productId: parsedProductId }
    } catch (error) {
      logger.error('Excel import error', error)
      toast.error(t('engineering.bomArchive.toasts.parseFailed'), { id: loadingId })
      return null
    }
  }

  return {
    data,
    products,
    materials,
    dictEntries,
    isLoading,
    persistData,
    saveBOM,
    deleteBOM,
    downloadTemplate,
    parseExcel,
  }
}

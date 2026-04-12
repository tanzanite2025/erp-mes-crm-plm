'use client'

import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isConflictError } from '@/lib/handle-server-error'
import { createLogger } from '@/lib/logger'
import { type DeltaSet } from '@/lib/delta/types'
import { failLoudly } from '@/lib/safe-catch'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type BOMItemDraft, type SaveBOMInput } from '../mutation-types'
import { useBOMWriteActions } from './use-bom-write-actions'
import { BOMS_QUERY_KEY, PRODUCTS_QUERY_KEY } from '../query-keys'
import { bomService } from '../services/bom-service'
import { ExcelService } from '../services/excel-service'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMData')

export function useBOMData() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const bomsQuery = useQuery({
    queryKey: BOMS_QUERY_KEY,
    queryFn: () => bomService.getBOMs(),
  })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
  })
  const productsQuery = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => ProductCoreService.getProducts(),
  })
  const { saveBOM: persistBOM, deleteBOM: removeBOM } = useBOMWriteActions()
  const data = useMemo(() => {
    if (bomsQuery.isLoading) return []
    if (!bomsQuery.data) {
      const error = new Error('[CRITICAL] BOM data is missing after load')
      failLoudly(error, 'useBOMData.boms')
      throw error
    }
    return bomsQuery.data
  }, [bomsQuery.data, bomsQuery.isLoading])
  const materials = useMemo(() => {
    if (materialsQuery.isLoading) return []
    if (!materialsQuery.data) {
      const error = new Error('[CRITICAL] BOM materials are missing after load')
      failLoudly(error, 'useBOMData.materials')
      throw error
    }
    return materialsQuery.data
  }, [materialsQuery.data, materialsQuery.isLoading])
  const products = useMemo(() => {
    if (productsQuery.isLoading) return []
    if (!productsQuery.data) {
      const error = new Error('[CRITICAL] BOM products are missing after load')
      failLoudly(error, 'useBOMData.products')
      throw error
    }
    return productsQuery.data
  }, [productsQuery.data, productsQuery.isLoading])
  const isLoading = bomsQuery.isLoading || materialsQuery.isLoading || productsQuery.isLoading

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

  useEffect(() => {
    if (bomsQuery.error) {
      logger.error('BOM data load error', bomsQuery.error)
      toast.error(t('engineering.bomArchive.toasts.loadFailed'))
    }
  }, [bomsQuery.error, t])

  useEffect(() => {
    if (materialsQuery.error) {
      logger.error('BOM materials load error', materialsQuery.error)
      toast.error(t('engineering.bomArchive.toasts.loadFailed'))
    }
  }, [materialsQuery.error, t])

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

  const downloadTemplate = async () => {
    const loadingId = toast.loading(t('engineering.bomArchive.toasts.downloadLoading'))

    try {
      const loadedMaterials = await queryClient.fetchQuery({
        queryKey: MATERIAL_OPTIONS_QUERY_KEY,
        queryFn: () => MaterialCoreService.getMaterialOptions(),
      })
      if (!loadedMaterials) {
        const error = new Error('[CRITICAL] Material options missing during BOM template export')
        failLoudly(error, 'useBOMData.downloadTemplate')
        throw error
      }

      await ExcelService.generateBOMTemplate(loadedMaterials, products)
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
      const validItems: BOMItemDraft[] = []
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
        logger.error(
          'BOM import blocked: extracted workbook contains material master data rows that require explicit maintenance flow',
          {
            extractedMaterialCount: extractedMaterials.length,
          }
        )
        toast.error(t('engineering.bomArchive.toasts.parseFailed'), { id: loadingId })
        return null
      }

      const latestMaterials = await queryClient.fetchQuery({
        queryKey: MATERIAL_OPTIONS_QUERY_KEY,
        queryFn: () => MaterialCoreService.getMaterialOptions(),
      })
      if (!latestMaterials) {
        const error = new Error('[CRITICAL] Material options missing during BOM import')
        failLoudly(error, 'useBOMData.parseExcel')
        throw error
      }

      const processedItems = validItems.map((item) => {
        if (!item.section) {
          const error = new Error('[CRITICAL] Missing BOM section in imported row')
          failLoudly(error, 'useBOMData.parseExcel')
          throw error
        }
        if (!item.materialId) {
          const error = new Error('[CRITICAL] Missing BOM materialId in imported row')
          failLoudly(error, 'useBOMData.parseExcel')
          throw error
        }
        if (typeof item.unitUsage !== 'number' || Number.isNaN(item.unitUsage)) {
          const error = new Error('[CRITICAL] Missing or invalid BOM unitUsage in imported row')
          failLoudly(error, 'useBOMData.parseExcel')
          throw error
        }
        if (typeof item.wastagePercent !== 'number' || Number.isNaN(item.wastagePercent)) {
          const error = new Error('[CRITICAL] Missing or invalid BOM wastagePercent in imported row')
          failLoudly(error, 'useBOMData.parseExcel')
          throw error
        }
        if (typeof item.unitPrice !== 'number' || Number.isNaN(item.unitPrice)) {
          const error = new Error('[CRITICAL] Missing or invalid BOM unitPrice in imported row')
          failLoudly(error, 'useBOMData.parseExcel')
          throw error
        }
        if (!item.unit) {
          const error = new Error('[CRITICAL] Missing BOM unit in imported row')
          failLoudly(error, 'useBOMData.parseExcel')
          throw error
        }

        const material = latestMaterials.find((entry) => entry.id === item.materialId)
        if (!material) {
          const error = new Error(`[CRITICAL] Missing material master for BOM item ${item.materialId}`)
          failLoudly(error, 'useBOMData.parseExcel')
          throw error
        }
        if (!material.category) {
          const error = new Error(`[CRITICAL] Missing material category for ${item.materialId}`)
          failLoudly(error, 'useBOMData.parseExcel')
          throw error
        }
        const materialTypeLabel = categoryMap[material.category as keyof typeof categoryMap]
        if (!materialTypeLabel) {
          const error = new Error(`[CRITICAL] Unsupported material category ${material.category}`)
          failLoudly(error, 'useBOMData.parseExcel')
          throw error
        }

        return {
          id: crypto.randomUUID(),
          section: item.section,
          materialId: item.materialId,
          materialName: material.name,
          materialSpec: material.spec,
          unitPrice: item.unitPrice,
          unit: item.unit,
          unitUsage: item.unitUsage,
          wastagePercent: item.wastagePercent,
          materialType: materialTypeLabel,
          supplyChannel: item.supplyChannel,
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
    isLoading,
    saveBOM,
    deleteBOM,
    downloadTemplate,
    parseExcel,
  }
}


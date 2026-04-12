'use client'

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type Product } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import { ExcelService } from '../services/excel-service'

const logger = createLogger('useBOMImportExport')

interface UseBOMImportExportParams {
  products: Product[]
}

export function useBOMImportExport({ products }: UseBOMImportExportParams) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

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

  const downloadTemplate = async () => {
    const loadingId = toast.loading(t('engineering.bomArchive.toasts.downloadLoading'))

    try {
      const loadedMaterials = await queryClient.fetchQuery({
        queryKey: MATERIAL_OPTIONS_QUERY_KEY,
        queryFn: () => MaterialCoreService.getMaterialOptions(),
      })
      if (!loadedMaterials) {
        const error = new Error('[CRITICAL] Material options missing during BOM template export')
        failLoudly(error, 'useBOMImportExport.downloadTemplate')
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
        failLoudly(error, 'useBOMImportExport.parseExcel')
        throw error
      }

      const processedItems = validItems.map((item) => {
        if (!item.section) {
          const error = new Error('[CRITICAL] Missing BOM section in imported row')
          failLoudly(error, 'useBOMImportExport.parseExcel')
          throw error
        }
        if (!item.materialId) {
          const error = new Error('[CRITICAL] Missing BOM materialId in imported row')
          failLoudly(error, 'useBOMImportExport.parseExcel')
          throw error
        }
        if (typeof item.unitUsage !== 'number' || Number.isNaN(item.unitUsage)) {
          const error = new Error('[CRITICAL] Missing or invalid BOM unitUsage in imported row')
          failLoudly(error, 'useBOMImportExport.parseExcel')
          throw error
        }
        if (typeof item.wastagePercent !== 'number' || Number.isNaN(item.wastagePercent)) {
          const error = new Error('[CRITICAL] Missing or invalid BOM wastagePercent in imported row')
          failLoudly(error, 'useBOMImportExport.parseExcel')
          throw error
        }
        if (typeof item.unitPrice !== 'number' || Number.isNaN(item.unitPrice)) {
          const error = new Error('[CRITICAL] Missing or invalid BOM unitPrice in imported row')
          failLoudly(error, 'useBOMImportExport.parseExcel')
          throw error
        }
        if (!item.unit) {
          const error = new Error('[CRITICAL] Missing BOM unit in imported row')
          failLoudly(error, 'useBOMImportExport.parseExcel')
          throw error
        }

        const material = latestMaterials.find((entry) => entry.id === item.materialId)
        if (!material) {
          const error = new Error(`[CRITICAL] Missing material master for BOM item ${item.materialId}`)
          failLoudly(error, 'useBOMImportExport.parseExcel')
          throw error
        }
        if (!material.category) {
          const error = new Error(`[CRITICAL] Missing material category for ${item.materialId}`)
          failLoudly(error, 'useBOMImportExport.parseExcel')
          throw error
        }
        const materialTypeLabel = categoryMap[material.category as keyof typeof categoryMap]
        if (!materialTypeLabel) {
          const error = new Error(`[CRITICAL] Unsupported material category ${material.category}`)
          failLoudly(error, 'useBOMImportExport.parseExcel')
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
    downloadTemplate,
    parseExcel,
  }
}

'use client'

import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isConflictError } from '@/lib/handle-server-error'
import { createLogger } from '@/lib/logger'
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
  const data = bomsQuery.data ?? []
  const materials = materialsQuery.data ?? []
  const products = productsQuery.data ?? []
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

  const saveBOM = async (bom: SaveBOMInput) => {
    try {
      await persistBOM(bom)
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
      const loadedMaterials =
        (await queryClient.fetchQuery({
          queryKey: MATERIAL_OPTIONS_QUERY_KEY,
          queryFn: () => MaterialCoreService.getMaterialOptions(),
        })) ?? []

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
        toast.error('BOM 瀵煎叆宸查樆鏂細妫€娴嬪埌鐗╂枡涓绘暟鎹锛岃鍏堝湪鐗╂枡妗ｆ涓樉寮忕淮鎶ょ繖浜涚墿鏂欏悗鍐嶅鍏?BOM銆?')
        return null
      }

      const latestMaterials =
        (await queryClient.fetchQuery({
          queryKey: MATERIAL_OPTIONS_QUERY_KEY,
          queryFn: () => MaterialCoreService.getMaterialOptions(),
        })) ?? []

      const processedItems = validItems.map((item) => {
        const material = latestMaterials.find((entry) => entry.id === item.materialId)

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
    isLoading,
    saveBOM,
    deleteBOM,
    downloadTemplate,
    parseExcel,
  }
}

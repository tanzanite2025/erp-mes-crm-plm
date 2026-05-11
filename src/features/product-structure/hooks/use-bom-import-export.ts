'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type Product } from '../data/schema'
import { ExcelService } from '../services/excel-service'

const logger = createLogger('useBOMImportExport')

interface UseBOMImportExportParams {
  products: Product[]
  productDisplayLabelMap: Map<string, string>
  sections: BOMSectionOption[]
}

export function useBOMImportExport({ products, productDisplayLabelMap, sections }: UseBOMImportExportParams) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

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

      await ExcelService.generateBOMTemplate(loadedMaterials, products, sections, productDisplayLabelMap)
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
      } = await ExcelService.parseBOMExcel(file, sections)

      if (parsedItems.length === 0) {
        toast.error(t('engineering.bomArchive.toasts.parseNoValid'), { id: loadingId })
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

      const { items: processedItems, errors } = ExcelService.normalizeParsedBOMItems({
        parsedItems,
        materials: latestMaterials,
        sections,
      })

      if (errors.length > 0) {
        logger.error('BOM import normalization error', errors)
        toast.error(
          t('engineering.bomArchive.toasts.parseSchemaErrors', {
            count: errors.length,
          }),
          { id: loadingId }
        )
        return null
      }

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

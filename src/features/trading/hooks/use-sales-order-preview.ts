import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
import {
  ENGINEERING_DB_DRILLING_QUERY_KEY,
  ENGINEERING_DB_LABELING_QUERY_KEY,
  ENGINEERING_DB_SPECS_QUERY_KEY,
} from '@/features/engineering-db/query-keys'
import { SpecsService } from '@/features/engineering-db/services/specs-service'
import { ProductionDBService } from '@/features/engineering-db/services/production-db-service'
import { FileResolverService } from '@/features/engineering-db/services/file-resolver-service'
import { PRODUCTS_QUERY_KEY, productDetailQueryKey } from '@/features/engineering/query-keys'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'

type DrawingType = 'spec' | 'drilling' | 'labeling'

interface PreviewFile {
  fileName: string
  fileUrl: string
}

interface ProductPreviewRefs {
  id?: string
  engineeringSpecId?: string
  techSpecId?: string
}

interface PreviewAsset {
  id: string
  fileUrl?: string
  name?: string
  fileExtension?: string
}

export function useSalesOrderPreview() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null)
  const [isCADOpen, setIsCADOpen] = useState(false)
  const [isPDFOpen, setIsPDFOpen] = useState(false)
  const [isExcelOpen, setIsExcelOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (previewFile?.fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewFile.fileUrl)
      }
    }
  }, [previewFile?.fileUrl])

  const handlePreview = async (
    productId: string | undefined,
    planId: string | undefined,
    type: DrawingType
  ) => {
    try {
      let targetId = planId
      if (!targetId && productId && type === 'spec') {
        const products = await queryClient.fetchQuery({
          queryKey: PRODUCTS_QUERY_KEY,
          queryFn: () => ProductCoreService.getProducts(),
        })

        const cachedProduct = (products as ProductPreviewRefs[]).find((product) => product.id === productId)
        targetId = cachedProduct?.engineeringSpecId

        if (!targetId) {
          const product = (await queryClient.fetchQuery({
            queryKey: productDetailQueryKey(productId),
            queryFn: () => ProductCoreService.getProductById(productId),
          })) as ProductPreviewRefs | null
          targetId = product?.engineeringSpecId || product?.techSpecId
        }
      }

      if (!targetId) {
        toast.error(t('tradingSalesOrder.preview.noTechFile'))
        return
      }

      const files: PreviewAsset[] =
        type === 'spec'
          ? await queryClient.fetchQuery({
              queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
              queryFn: () => SpecsService.getSpecs(),
            })
          : type === 'drilling'
            ? await queryClient.fetchQuery({
                queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
                queryFn: () => ProductionDBService.getDrilling(),
              })
            : await queryClient.fetchQuery({
                queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
                queryFn: () => ProductionDBService.getLabeling(),
              })

      const file = files.find((item) => item.id === targetId)
      if (!file || !file.fileUrl) {
        toast.error(t('tradingSalesOrder.preview.fileMissing'))
        return
      }

      const resolvedUrl = await FileResolverService.resolveFileUrl(file.fileUrl)
      if (!resolvedUrl) {
        toast.error(t('tradingSalesOrder.preview.resolveFailed'))
        return
      }

      const fileName = file.name || t('tradingSalesOrder.preview.unknownFile')
      setPreviewFile({ fileName, fileUrl: resolvedUrl })

      const ext = file.fileExtension || fileName.split('.').pop()?.toLowerCase() || ''
      if (['dwg', 'dxf', 'rvt'].includes(ext)) setIsCADOpen(true)
      else if (['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) setIsPDFOpen(true)
      else if (['xlsx', 'xls', 'csv'].includes(ext)) setIsExcelOpen(true)
      else window.open(resolvedUrl, '_blank')
    } catch (error) {
      failLoudly(error, 'SalesOrderDetail.handlePreview')
    }
  }

  return {
    handlePreview,
    isCADOpen,
    isExcelOpen,
    isPDFOpen,
    previewFile,
    setIsCADOpen,
    setIsExcelOpen,
    setIsPDFOpen,
  }
}

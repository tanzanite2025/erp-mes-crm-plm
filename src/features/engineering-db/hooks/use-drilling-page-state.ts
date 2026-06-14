import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { type DrillingPlan, type DrillingPlanInput } from '../data/schema'
import { ENGINEERING_DB_DRILLING_QUERY_KEY } from '../query-keys'
import { FileResolverService } from '../services/file-resolver-service'
import { ProductionDBService } from '../services/production-db-service'
import { getEngineeringDbPreviewKind } from '../view-helpers'
import { useEngineeringDbProductLookup } from './use-engineering-db-product-lookup'

export type DrillingRowViewModel = {
  item: DrillingPlan
  productSku: string | null
  productName: string | null
  searchText: string
}

export type DrillingSaveParams = {
  data: DrillingPlanInput
  isPatch: boolean
  delta?: DeltaSet
  version?: number
}

export function useDrillingPageState() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const { highlightId } = useSearch({
    from: '/_authenticated/engineering-db/drilling',
  })
  const { productMap } = useEngineeringDbProductLookup()
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<DrillingPlan | undefined>(
    undefined
  )
  const [cadPreviewOpen, setCadPreviewOpen] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [excelPreviewOpen, setExcelPreviewOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
    sku?: string
  } | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
    queryFn: () => ProductionDBService.getDrilling(),
  })

  const saveMutation = useMutation({
    mutationFn: async (params: DrillingSaveParams) => {
      const { data: formData, isPatch, delta, version } = params
      if (isPatch && delta) {
        if (!currentRow?.id) {
          return
        }
        await ProductionDBService.patchDrilling(
          currentRow.id,
          delta,
          version ?? 1
        )
        return
      }
      await ProductionDBService.saveDrillingItem(formData)
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
      })
      setOpen(false)
      setCurrentRow(undefined)
      toast.success(
        variables.isPatch
          ? t('engineering.drilling.toasts.updateSuccess')
          : t('engineering.drilling.toasts.saveSuccess')
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ProductionDBService.deleteDrilling(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
      })
      toast.success(t('engineering.drilling.toasts.deleteSuccess'))
    },
  })

  useEffect(() => {
    return () => {
      if (previewFile?.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewFile.url)
      }
    }
  }, [previewFile?.url])

  const filteredRows = useMemo(() => {
    const rows = data.map<DrillingRowViewModel>((item) => {
      const product = productMap.get(item.productId)
      return {
        item,
        productSku: product?.sku || null,
        productName: product?.name || null,
        searchText: [
          item.name,
          product?.sku || '',
          product?.name || '',
          item.weavingModeLabel || '',
          item.standardHoles || '',
        ]
          .join(' ')
          .toLowerCase(),
      }
    })

    const searchStr = searchTerm.trim().toLowerCase()
    if (!searchStr) {
      return rows
    }

    return rows.filter((row) => row.searchText.includes(searchStr))
  }, [data, productMap, searchTerm])

  const handlePreview = async (item: DrillingPlan) => {
    if (!item.fileUrl) {
      toast.error(t('engineering.drilling.toasts.noFile'))
      return
    }

    const resolvedUrl = await FileResolverService.resolveFileUrl(item.fileUrl)
    if (!resolvedUrl) {
      toast.error(t('engineering.drilling.toasts.unResolved'))
      return
    }

    const product = productMap.get(item.productId)
    setPreviewFile({
      url: resolvedUrl,
      name: item.name,
      sku: product?.sku,
    })

    const previewKind = getEngineeringDbPreviewKind(item.fileExtension)
    if (previewKind === 'cad') {
      setCadPreviewOpen(true)
      return
    }

    if (previewKind === 'excel') {
      setExcelPreviewOpen(true)
      return
    }

    setPdfPreviewOpen(true)
  }

  const handleCreate = () => {
    setCurrentRow(undefined)
    setOpen(true)
  }

  const handleEdit = (item: DrillingPlan) => {
    setCurrentRow(item)
    setOpen(true)
  }

  const handleDelete = (item: DrillingPlan) => {
    runConfirmedAction({
      confirmKey: 'engineering.drilling.toasts.deleteConfirm',
      onAction: async () => {
        await deleteMutation.mutateAsync(item.id)
      },
    })
  }

  const handleSave = async (params: DrillingSaveParams) => {
    await saveMutation.mutateAsync(params)
  }

  return {
    searchTerm,
    setSearchTerm,
    open,
    setOpen,
    currentRow,
    filteredRows,
    isLoading,
    isSaving: saveMutation.isPending,
    highlightId,
    previewFile,
    cadPreviewOpen,
    setCadPreviewOpen,
    pdfPreviewOpen,
    setPdfPreviewOpen,
    excelPreviewOpen,
    setExcelPreviewOpen,
    handleCreate,
    handleEdit,
    handleDelete,
    handlePreview,
    handleSave,
  }
}

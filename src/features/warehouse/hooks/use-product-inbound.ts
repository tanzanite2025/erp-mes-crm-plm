import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { failLoudly } from '@/lib/safe-catch'
import {
  WarehouseCategoryCoreService,
  type WarehouseCategoryOption,
} from '../category'
import {
  InventoryCoreService,
  InventoryTransactionService,
  type InboundTDO,
  type MasterDataSearchResult,
} from '../inventory'
import { warehouseQueryKeys } from '../query-keys'
import {
  filterWarehouseCategoriesByScene,
  getDefaultWarehouseCategoryCode,
} from '../utils/warehouse-category-config'

type InboundFormData = {
  quantity: number
  batchNo: string
  targetCategory: string
  entryDate: string
  remarks: string
}

const DEFAULT_INBOUND_DATA: InboundFormData = {
  quantity: 1,
  batchNo: '',
  targetCategory: '',
  entryDate: '',
  remarks: '',
}

function resolveInboundCategoryLookup(
  warehouseCategories: WarehouseCategoryOption[],
  scene: 'product-inbound' | 'material-inbound',
  preferredCode?: string
) {
  const selectableCategories = filterWarehouseCategoriesByScene(
    warehouseCategories,
    scene
  )
  if (selectableCategories.length === 0) {
    throw new Error(`[CRITICAL] Missing warehouse categories for ${scene}`)
  }

  const defaultCategoryCode = getDefaultWarehouseCategoryCode(
    warehouseCategories,
    scene,
    preferredCode
  )
  if (!defaultCategoryCode) {
    throw new Error(`[CRITICAL] Missing default warehouse category for ${scene}`)
  }

  return {
    selectableCategories,
    defaultCategoryCode,
  }
}

function buildInboundTDO(
  selectedItem: MasterDataSearchResult,
  formData: InboundFormData
): InboundTDO {
  return {
    materialId: selectedItem.id,
    quantity: formData.quantity,
    batchNo: formData.batchNo,
    entryDate: formData.entryDate,
    remarks: formData.remarks,
    targetCategory: formData.targetCategory,
  }
}

export function useProductInbound() {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<MasterDataSearchResult | null>(
    null
  )
  const [isInboundOpen, setIsInboundOpen] = useState(false)
  const [formData, setFormData] = useState<InboundFormData>(DEFAULT_INBOUND_DATA)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const historyQuery = useQuery({
    queryKey: warehouseQueryKeys.inboundHistory(),
    queryFn: () => InventoryCoreService.getInboundHistory(),
  })

  const categoriesQuery = useQuery({
    queryKey: warehouseQueryKeys.categoryOptions(),
    queryFn: () => WarehouseCategoryCoreService.getCategoryOptions(),
  })

  const searchQueryResult = useQuery({
    queryKey: warehouseQueryKeys.masterDataSearch(debouncedSearchQuery),
    queryFn: () => InventoryCoreService.searchMasterData(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0,
  })

  useEffect(() => {
    if (!historyQuery.error && !categoriesQuery.error) return
    toast.error(t('warehouse.inbound.toast.failed'))
  }, [categoriesQuery.error, historyQuery.error, t])

  useEffect(() => {
    if (!debouncedSearchQuery || !searchQueryResult.isSuccess) return
    if ((searchQueryResult.data ?? []).length > 0) return
    toast.error(t('warehouse.inbound.toast.notFound'))
  }, [debouncedSearchQuery, searchQueryResult.data, searchQueryResult.isSuccess, t])

  const submitInboundMutation = useMutation({
    mutationFn: async (payload: InboundTDO) => {
      return InventoryTransactionService.recordInbound(payload)
    },
    onSuccess: async (savedRecord) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.inboundHistory(),
        }),
        queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryList() }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.inventoryValuation(),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.inventoryAlertSummary(),
        }),
      ])

      toast.success(
        t('warehouse.inbound.toast.success', { name: savedRecord.materialName })
      )
      setIsInboundOpen(false)
      setSelectedItem(null)
      setSearchQuery('')
      setDebouncedSearchQuery('')
      setFormData(DEFAULT_INBOUND_DATA)
    },
    onError: (error) => {
      failLoudly(error, 'useProductInbound.submitInbound')
    },
  })

  const history = useMemo(() => {
    if (historyQuery.isLoading) return []
    if (!historyQuery.data) {
      const lookupError =
        historyQuery.error instanceof Error
          ? historyQuery.error
          : new Error('[CRITICAL] Inbound history missing after load')
      failLoudly(lookupError, 'useProductInbound.history')
      throw lookupError
    }
    return historyQuery.data
  }, [historyQuery.data, historyQuery.error, historyQuery.isLoading])

  const warehouseCategories = useMemo(() => {
    if (categoriesQuery.isLoading) return [] as WarehouseCategoryOption[]
    if (!categoriesQuery.data) {
      const lookupError =
        categoriesQuery.error instanceof Error
          ? categoriesQuery.error
          : new Error('[CRITICAL] Warehouse category options missing after load')
      failLoudly(lookupError, 'useProductInbound.categories')
      throw lookupError
    }
    return categoriesQuery.data
  }, [categoriesQuery.data, categoriesQuery.error, categoriesQuery.isLoading])

  const searchResults = debouncedSearchQuery
    ? (searchQueryResult.data ?? [])
    : []
  const isSearching = searchQueryResult.isFetching
  const hasSearched = searchQuery.trim().length > 0

  const selectableWarehouseCategories = useMemo(() => {
    if (!selectedItem) return warehouseCategories

    const scene =
      selectedItem.sourceModule === 'PRODUCT'
        ? 'product-inbound'
        : 'material-inbound'
    return resolveInboundCategoryLookup(
      warehouseCategories,
      scene,
      selectedItem.category
    ).selectableCategories
  }, [selectedItem, warehouseCategories])

  const openInboundForm = (item: MasterDataSearchResult) => {
    if (!allowsAction('action_warehouse_inbound_record')) return
    setSelectedItem(item)

    const scene =
      item.sourceModule === 'PRODUCT' ? 'product-inbound' : 'material-inbound'
    const { defaultCategoryCode } = resolveInboundCategoryLookup(
      warehouseCategories,
      scene,
      item.category
    )

    setFormData({
      targetCategory: defaultCategoryCode,
      batchNo: '',
      quantity: 1,
      entryDate: '',
      remarks: '',
    })
    setIsInboundOpen(true)
  }

  const submitInbound = async () => {
    if (!allowsAction('action_warehouse_inbound_record')) return
    if (!selectedItem) return
    if (formData.quantity <= 0) {
      toast.error(t('warehouse.inbound.toast.quantityInvalid'))
      return
    }

    await submitInboundMutation.mutateAsync(buildInboundTDO(selectedItem, formData))
  }

  const closeInboundDialog = () => {
    setIsInboundOpen(false)
    setFormData(DEFAULT_INBOUND_DATA)
  }

  return {
    error: historyQuery.error ?? categoriesQuery.error,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasSearched,
    selectedItem,
    isInboundOpen,
    formData,
    setFormData,
    history,
    warehouseCategories,
    selectableWarehouseCategories,
    openInboundForm,
    submitInbound,
    closeInboundDialog,
    isSubmittingInbound: submitInboundMutation.isPending,
  }
}

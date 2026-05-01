import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { failLoudly } from '@/lib/safe-catch'
import {
  WarehouseCategoryCoreService,
  type WarehouseCategoryOption,
} from '../category'
import {
  type InboundRecord,
  InventoryCoreService,
  InventoryTransactionService,
  type InboundTDO,
  type MasterDataSearchResult,
} from '../inventory'
import { warehouseQueryKeys } from '../query-keys'
import { WarehouseMasterDataService } from '../services/warehouse-master-data-service'
import {
  filterWarehouseCategoriesByScene,
  getDefaultWarehouseCategoryCode,
} from '../utils/warehouse-category-config'
import { createWarehouseUiFeedback, type WarehouseUiFeedback } from './warehouse-ui-feedback'

const logger = createLogger('useProductInbound')

export type ProductInboundReadResource = CompositeReadResource<{
  history: InboundRecord[]
  warehouseCategories: WarehouseCategoryOption[]
}>

export type ProductInboundSearchResource =
  | { status: 'idle' }
  | ReadResource<MasterDataSearchResult[]>

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

export function useProductInbound(feedback?: Pick<WarehouseUiFeedback, 'error' | 'success'>) {
  const { t } = useLanguage()
  const ui = useMemo(
    () => feedback ?? createWarehouseUiFeedback(),
    [feedback],
  )
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
    queryKey: warehouseQueryKeys.masterDataSearch('INBOUND', debouncedSearchQuery),
    queryFn: () => WarehouseMasterDataService.searchSelectableItems({
      query: debouncedSearchQuery,
      scope: 'INBOUND',
    }),
    enabled: debouncedSearchQuery.length > 0,
  })

  const readResource = useMemo<ProductInboundReadResource>(() => {
    const historyFailure = resolveQueryFailure({
      data: historyQuery.data,
      error: historyQuery.error,
      isPending: historyQuery.isPending,
      scope: 'useProductInbound.history',
      missingMessage: '[CRITICAL] Inbound history missing after load',
      failureMessage: '[CRITICAL] Inbound history query failed',
    })
    if (historyFailure) {
      return {
        status: 'error',
        error: historyFailure.error,
        scope: historyFailure.scope,
      }
    }

    const categoriesFailure = resolveQueryFailure({
      data: categoriesQuery.data,
      error: categoriesQuery.error,
      isPending: categoriesQuery.isPending,
      scope: 'useProductInbound.categories',
      missingMessage: '[CRITICAL] Warehouse category options missing after load',
      failureMessage: '[CRITICAL] Warehouse category options query failed',
    })
    if (categoriesFailure) {
      return {
        status: 'error',
        error: categoriesFailure.error,
        scope: categoriesFailure.scope,
      }
    }

    if (historyQuery.isPending || categoriesQuery.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      history: historyQuery.data as InboundRecord[],
      warehouseCategories: categoriesQuery.data as WarehouseCategoryOption[],
    }
  }, [
    categoriesQuery.data,
    categoriesQuery.error,
    categoriesQuery.isPending,
    historyQuery.data,
    historyQuery.error,
    historyQuery.isPending,
  ])

  const searchResource = useMemo<ProductInboundSearchResource>(() => {
    if (!debouncedSearchQuery) {
      return { status: 'idle' }
    }

    const searchFailure = resolveQueryFailure({
      data: searchQueryResult.data,
      error: searchQueryResult.error,
      isPending: searchQueryResult.isPending,
      scope: 'useProductInbound.search',
      missingMessage: '[CRITICAL] Product inbound search results missing after load',
      failureMessage: '[CRITICAL] Product inbound search query failed',
    })
    if (searchFailure) {
      return {
        status: 'error',
        error: searchFailure.error,
        scope: searchFailure.scope,
      }
    }

    if (searchQueryResult.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: searchQueryResult.data as MasterDataSearchResult[],
    }
  }, [
    debouncedSearchQuery,
    searchQueryResult.data,
    searchQueryResult.error,
    searchQueryResult.isPending,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    ui.error(t('warehouse.inbound.toast.failed'))
    logger.error(`Failed to load product inbound resources: ${readResource.scope}`, readResource.error)
    failLoudly(readResource.error, readResource.scope)
  }, [readResource, t, ui])

  useEffect(() => {
    if (searchResource.status !== 'error') {
      return
    }

    ui.error(t('warehouse.inbound.toast.failed'))
    logger.error(`Product inbound search failed: ${searchResource.scope}`, searchResource.error)
    failLoudly(searchResource.error, searchResource.scope)
  }, [searchResource, t, ui])

  useEffect(() => {
    if (searchResource.status !== 'ready') return
    if (searchResource.data.length > 0) return
    ui.error(t('warehouse.inbound.toast.notFound'))
  }, [searchResource, t, ui])

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

      ui.success(
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

  const history = useMemo(
    () => (readResource.status === 'ready' ? readResource.history : []),
    [readResource]
  )
  const warehouseCategories = useMemo(
    () => (readResource.status === 'ready' ? readResource.warehouseCategories : []),
    [readResource]
  )

  const searchResults = useMemo(
    () => (searchResource.status === 'ready' ? searchResource.data : []),
    [searchResource]
  )
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
    if (readResource.status !== 'ready') return
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
      ui.error(t('warehouse.inbound.toast.quantityInvalid'))
      return
    }

    await submitInboundMutation.mutateAsync(buildInboundTDO(selectedItem, formData))
  }

  const closeInboundDialog = () => {
    setIsInboundOpen(false)
    setFormData(DEFAULT_INBOUND_DATA)
  }

  return {
    readResource,
    searchResource,
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
    retryRead: async () => {
      await Promise.all([historyQuery.refetch(), categoriesQuery.refetch()])
    },
    retrySearch: searchQueryResult.refetch,
  }
}

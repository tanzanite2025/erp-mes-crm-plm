import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Box } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import { apiFetch } from '@/lib/api-client'
import { type DeltaSet } from '@/lib/delta/types'
import { getSearchItems, type SearchItem } from '@/components/layout/data/search-data'
import { type Material } from '@/features/material-archive/data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY } from '@/features/material-archive/query-keys'
import { MaterialMaintenanceService } from '@/features/material-archive/services/material-maintenance-service'
import { type Customer, type CustomerFormValues, type SalesOrder } from '@/features/trading/data/schema'
import { useCustomerMutations } from '@/features/trading/customer'
import { createLogger } from '@/lib/logger'
import { useCommandMenuKnowledge } from './use-command-menu-knowledge'

const logger = createLogger('useCommandMenu')
const ADD_MATERIAL_ACTION_ID = 'action-add-material'
const ADD_CUSTOMER_ACTION_ID = 'action-add-customer'
const CREATE_SALES_ORDER_ACTION_ID = 'action-create-sales-order'

type GlobalSearchApiItem = {
  id: string
  title: string
  href: string
  parentTitle: string
  code: string
}

type GlobalSearchApiResponse = {
  data?: GlobalSearchApiItem[]
}

export function normalizeSearchHref(href: string) {
  if (href === '/system-management/routing') {
    return '/approval/routing'
  }
  return href
}

function commandItemMatches(item: SearchItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (normalizedQuery === '') return true

  return [
    item.title,
    item.parentTitle,
    item.href,
    item.pinyin,
    ...(item.keywords ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}

export function useCommandMenu() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const [searchValue, setSearchValue] = React.useState('')
  const [asyncResults, setAsyncResults] = React.useState<SearchItem[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [debouncedValue, setDebouncedValue] = React.useState('')
  const [isMaterialCreateDialogOpen, setIsMaterialCreateDialogOpen] = React.useState(false)
  const [isCustomerCreateDialogOpen, setIsCustomerCreateDialogOpen] = React.useState(false)
  const [isSalesOrderCreateDialogOpen, setIsSalesOrderCreateDialogOpen] = React.useState(false)
  const { createMutation: createCustomerMutation } = useCustomerMutations()

  const searchItems = React.useMemo(() => getSearchItems(t), [t])

  const {
    knowledgeEntries,
    selectedKnowledgeEntry,
    setSelectedKnowledgeEntry,
  } = useCommandMenuKnowledge(open, searchValue)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(searchValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue])

  React.useEffect(() => {
    if (!open) {
      setIsMaterialCreateDialogOpen(false)
      setIsCustomerCreateDialogOpen(false)
      setIsSalesOrderCreateDialogOpen(false)
    }
  }, [open])

  React.useEffect(() => {
    if (debouncedValue.length < 2) {
      setAsyncResults([])
      setIsSearching(false)
      return
    }

    const fetchResults = async () => {
      setIsSearching(true)
      try {
        const res = await apiFetch<GlobalSearchApiResponse>(
          `/search/global?q=${debouncedValue}`
        )

        const results: SearchItem[] = []

        if (res?.data) {
          res.data.forEach((item) => {
            results.push({
              id: `rust-search-${item.id}`,
              title: item.title,
              href: normalizeSearchHref(item.href),
              category: 'data',
              icon: Box,
              parentTitle: item.parentTitle + ` (${item.code})`,
              keywords: [
                item.title,
                item.code,
                'search',
              ],
            })
          })
        }

        setAsyncResults(results)
      } catch (error) {
        logger.error('Global search (Rust-backed) failed', error)
      } finally {
        setIsSearching(false)
      }
    }

    fetchResults()
  }, [debouncedValue, t])

  const { mutateAsync: createMaterial } = useMutation({
    mutationFn: async ({ data }: { data: Material }) => {
      return MaterialMaintenanceService.saveMaterial(data)
    },
    onSuccess: async (savedMaterial) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['material-archive'] }),
        queryClient.invalidateQueries({ queryKey: MATERIAL_OPTIONS_QUERY_KEY }),
      ])
      toast.success('物料档案已保存')
      setIsMaterialCreateDialogOpen(false)
      setSearchValue('')
      setOpen(false)
      navigate({
        to: '/materials/$category',
        params: { category: savedMaterial.category || 'RAW_MATERIAL' },
      })
    },
  })

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  const groupedItems = React.useMemo(() => {
    return searchItems.filter((item) => commandItemMatches(item, searchValue)).reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, SearchItem[]>)
  }, [searchItems, searchValue])

  const handleNavigate = React.useCallback(
    (href: string) => {
      runCommand(() => navigate({ to: href }))
    },
    [navigate, runCommand]
  )

  const handleMaterialCreate = React.useCallback(
    async (data: Material, _isPatch?: boolean, _delta?: DeltaSet) => {
      await createMaterial({ data })
    },
    [createMaterial]
  )

  const handleCustomerCreate = React.useCallback(
    async (payload: {
      data: Customer | CustomerFormValues
      isPatch: boolean
      delta?: DeltaSet
    }) => {
      if (payload.isPatch) {
        return undefined
      }

      return createCustomerMutation.mutateAsync(payload.data as CustomerFormValues)
    },
    [createCustomerMutation]
  )

  const handleCustomerCreated = React.useCallback(
    (_savedCustomer: Customer) => {
      setIsCustomerCreateDialogOpen(false)
      setSearchValue('')
      setOpen(false)
      navigate({
        to: '/trading/customers',
      })
    },
    [navigate, setOpen]
  )

  const handleSalesOrderCreated = React.useCallback(
    (savedOrder: SalesOrder) => {
      setIsSalesOrderCreateDialogOpen(false)
      setSearchValue('')
      setOpen(false)
      navigate({
        to: '/trading/sales-orders',
        search: (prev) => ({
          ...prev,
          detailId: savedOrder.id,
        }),
      })
    },
    [navigate, setOpen]
  )

  const handleItemSelect = React.useCallback(
    (item: SearchItem) => {
      if (item.id === ADD_MATERIAL_ACTION_ID) {
        setIsMaterialCreateDialogOpen(true)
        return
      }

      if (item.id === ADD_CUSTOMER_ACTION_ID) {
        setIsCustomerCreateDialogOpen(true)
        return
      }

      if (item.id === CREATE_SALES_ORDER_ACTION_ID) {
        setIsSalesOrderCreateDialogOpen(true)
        return
      }

      handleNavigate(item.href)
    },
    [handleNavigate]
  )

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    runCommand(() => setTheme(theme))
  }

  return {
    open,
    setOpen,
    searchValue,
    setSearchValue,
    asyncResults,
    knowledgeEntries,
    selectedKnowledgeEntry,
    setSelectedKnowledgeEntry,
    isSearching,
    groupedItems,
    handleItemSelect,
    handleThemeChange,
    isMaterialCreateDialogOpen,
    setIsMaterialCreateDialogOpen,
    handleMaterialCreate,
    isCustomerCreateDialogOpen,
    setIsCustomerCreateDialogOpen,
    handleCustomerCreate,
    handleCustomerCreated,
    isSalesOrderCreateDialogOpen,
    setIsSalesOrderCreateDialogOpen,
    handleSalesOrderCreated,
  }
}

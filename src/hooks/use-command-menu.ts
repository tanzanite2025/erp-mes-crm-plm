import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Box, Package } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import { apiFetch } from '@/lib/api-client'
import { getSearchItems, type SearchItem } from '@/components/layout/data/search-data'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useCommandMenu')

export function useCommandMenu() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const [searchValue, setSearchValue] = React.useState('')
  const [asyncResults, setAsyncResults] = React.useState<SearchItem[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [debouncedValue, setDebouncedValue] = React.useState('')

  const searchItems = React.useMemo(() => getSearchItems(t), [t])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(searchValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue])

  React.useEffect(() => {
    if (debouncedValue.length < 2) {
      setAsyncResults([])
      setIsSearching(false)
      return
    }

    const fetchResults = async () => {
      setIsSearching(true)
      try {
        const [matRes, prodRes] = await Promise.all([
          apiFetch<any>(`/materials?search=${debouncedValue}&pageSize=5`),
          apiFetch<any>(`/engineering/products?search=${debouncedValue}&pageSize=5`),
        ])

        const results: SearchItem[] = []

        if (matRes?.data) {
          matRes.data.forEach((material: any) => {
            results.push({
              id: `async-mat-${material.id}`,
              title: material.name,
              href: `/materials?id=${material.id}`,
              category: 'data',
              icon: Box,
              parentTitle: t('commandMenu.async.materialArchiveResult', {
                code: material.code || '',
              }),
              keywords: [
                material.name,
                material.code || '',
                t('commandMenu.parents.materialArchive'),
                'material',
                '物料',
              ],
            })
          })
        }

        if (prodRes?.data) {
          prodRes.data.forEach((product: any) => {
            results.push({
              id: `async-prod-${product.id}`,
              title: product.name,
              href: `/engineering/products?id=${product.id}`,
              category: 'data',
              icon: Package,
              parentTitle: t('commandMenu.async.productBomResult', {
                code: product.code || '',
              }),
              keywords: [
                product.name,
                product.code || '',
                'product',
                'bom',
                '产品',
                'BOM',
              ],
            })
          })
        }

        setAsyncResults(results)
      } catch (error) {
        logger.error('Global search failed', error)
      } finally {
        setIsSearching(false)
      }
    }

    fetchResults()
  }, [debouncedValue, t])

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  const groupedItems = React.useMemo(() => {
    return searchItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, SearchItem[]>)
  }, [searchItems])

  const handleNavigate = (href: string) => {
    runCommand(() => navigate({ to: href }))
  }

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    runCommand(() => setTheme(theme))
  }

  return {
    open,
    setOpen,
    searchValue,
    setSearchValue,
    asyncResults,
    isSearching,
    groupedItems,
    handleNavigate,
    handleThemeChange,
  }
}

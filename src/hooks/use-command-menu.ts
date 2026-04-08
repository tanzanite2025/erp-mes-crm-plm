import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Box } from 'lucide-react'
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
        const res = await apiFetch<any>(`/search/global?q=${debouncedValue}`)

        const results: SearchItem[] = []

        if (res?.data) {
          res.data.forEach((item: any) => {
            results.push({
              id: `rust-search-${item.id}`,
              title: item.title,
              href: item.href,
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

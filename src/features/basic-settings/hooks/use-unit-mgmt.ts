import { useState, useMemo, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import {
  unitService,
  type Unit,
  type UnitCategory,
} from '../services/unit-service'
import { useUnitsQuery } from './use-units-query'

const logger = createLogger('useUnitMgmt')

export function useUnitMgmt() {
  const { t } = useLanguage()
  const { units, isLoading, invalidateUnits } = useUnitsQuery()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<UnitCategory | 'ALL'>(
    'ALL'
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

  const refreshData = useCallback(
    async (_silent = false) => {
      try {
        await invalidateUnits()
      } catch (error) {
        logger.error('Static data synchronization failed in UnitMgmt', error)
        throw error
      }
    },
    [invalidateUnits]
  )

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const matchesSearch =
        unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory =
        categoryFilter === 'ALL' || unit.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, searchTerm, units])

  const handleOpenDialog = (unit?: Unit) => {
    setEditingUnit(unit || null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (unit: Unit) => {
    if (
      !window.confirm(
        t('basicSettings.units.confirmDelete', { name: unit.name })
      )
    )
      return
    try {
      await unitService.deleteUnit(unit.id)
      await invalidateUnits()
    } catch (error) {
      logger.error('Unrecoverable error during unit deletion', error)
      throw error
    }
  }

  return {
    units,
    filteredUnits,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingUnit,
    handleOpenDialog,
    handleDelete,
    refreshData,
  }
}

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { unitService, Unit, UnitCategory } from '../services/unit-service'

const logger = createLogger('useUnitMgmt')

export function useUnitMgmt() {
  const { t } = useLanguage()
  const [units, setUnits] = useState<Unit[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<UnitCategory | 'ALL'>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const data = await unitService.getUnits()
      setUnits(data)
    } catch (error) {
      logger.error('Static data synchronization failed in UnitMgmt', error)
      throw error // 重新抛出以触发表层 ErrorBoundary 或全局异常监控
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshData()

    const handleUpdate = () => {
      void refreshData(true)
    }

    window.addEventListener('xdfc_units_updated', handleUpdate)
    return () => window.removeEventListener('xdfc_units_updated', handleUpdate)
  }, [refreshData])

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const matchesSearch =
        unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === 'ALL' || unit.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, searchTerm, units])

  const handleOpenDialog = (unit?: Unit) => {
    setEditingUnit(unit || null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (unit: Unit) => {
    if (!window.confirm(t('basicSettings.units.confirmDelete', { name: unit.name }))) return
    try {
      await unitService.deleteUnit(unit.id)
      void refreshData()
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

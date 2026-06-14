import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { failLoudly } from '@/lib/safe-catch'
import { type Material, type MaterialCategory } from '../data/schema'
import {
  getMaterialListQueryKey,
  MATERIAL_OPTIONS_QUERY_KEY,
} from '../query-keys'
import { MaterialCoreService } from '../services/material-core-service'
import { MaterialMaintenanceService } from '../services/material-maintenance-service'

type MaterialListResponse = {
  data?: Material[]
  total?: number
}

interface UseMaterialMgmtDataParams {
  category?: MaterialCategory
}

export function useMaterialMgmtData({ category }: UseMaterialMgmtDataParams) {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const {
    data: qData,
    error,
    isLoading,
  } = useQuery<MaterialListResponse>({
    queryKey: getMaterialListQueryKey(
      category,
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearch
    ),
    queryFn: () =>
      MaterialCoreService.getMaterials(
        category,
        pagination.pageIndex + 1,
        pagination.pageSize,
        debouncedSearch
      ),
  })

  const materials = useMemo(() => {
    if (isLoading) return []
    if (!qData?.data) {
      const error = new Error('[CRITICAL] Material list is missing after load')
      failLoudly(error, 'useMaterialMgmtData.materials')
      throw error
    }
    return qData.data
  }, [isLoading, qData])

  const totalCount = useMemo(() => {
    if (isLoading) return 0
    if (typeof qData?.total !== 'number' || Number.isNaN(qData.total)) {
      const error = new Error(
        '[CRITICAL] Material total count is missing after load'
      )
      failLoudly(error, 'useMaterialMgmtData.totalCount')
      throw error
    }
    return qData.total
  }, [isLoading, qData])

  const invalidateMaterialQueries = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['material-archive'] }),
      queryClient.invalidateQueries({ queryKey: MATERIAL_OPTIONS_QUERY_KEY }),
    ])

  const upsertMutation = useMutation({
    mutationFn: async ({
      data,
      isPatch,
      delta,
    }: {
      data: Material
      isPatch?: boolean
      delta?: DeltaSet
    }) => {
      if (isPatch && delta && data.id) {
        if (typeof data.version !== 'number' || Number.isNaN(data.version)) {
          const error = new Error(
            '[CRITICAL] Missing material version for patch operation'
          )
          failLoudly(error, 'useMaterialMgmtData.patchMaterial')
          throw error
        }
        return MaterialMaintenanceService.patchMaterial(
          data.id,
          delta,
          data.version
        )
      }
      return MaterialMaintenanceService.saveMaterial(data)
    },
    onSuccess: async (_updatedMaterial, { isPatch }) => {
      await invalidateMaterialQueries()
      toast.success(isPatch ? '物料档案已更新' : '物料档案已保存')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MaterialMaintenanceService.deleteMaterial(id),
    onSuccess: async () => {
      await invalidateMaterialQueries()
      toast.success('物料已删除')
    },
  })
  return {
    queryClient,
    searchTerm,
    setSearchTerm,
    pagination,
    setPagination,
    error,
    isLoading,
    filteredMaterials: materials,
    totalCount,
    upsertMutation,
    deleteMutation,
  }
}

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type Material, type MaterialCategory } from '../data/schema'
import { deleteMaterial, getMaterials, saveMaterial, patchMaterial } from '../services/material-service'
import { type DeltaSet } from '@/lib/delta/types'

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

    const { data: qData, error, isLoading } = useQuery<MaterialListResponse>({
        queryKey: ['material-archive', category, pagination.pageIndex, pagination.pageSize, debouncedSearch],
        queryFn: () => getMaterials(category, pagination.pageIndex + 1, pagination.pageSize, debouncedSearch),
    })

    const materials = qData?.data || []
    const totalCount = qData?.total || 0

    const upsertMutation = useMutation({
        mutationFn: async ({ data, isPatch, delta }: { data: Material, isPatch?: boolean, delta?: DeltaSet }) => {
            if (isPatch && delta && data.id) {
                return patchMaterial(data.id, delta, data.version || 1)
            }
            return saveMaterial(data)
        },
        onSuccess: (_, { isPatch }) => {
            queryClient.invalidateQueries({ queryKey: ['material-archive'] })
            toast.success(isPatch ? '物料档案已更新 (SDRTS Patch)' : '物料档案已同步')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: deleteMaterial,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['material-archive'] })
            toast.success('物料已移除')
        }
    })

    useEffect(() => {
        const handleRefresh = () => {
            queryClient.invalidateQueries({ queryKey: ['material-archive'] })
        }
        window.addEventListener('xdfc_storage_initialized', handleRefresh)
        return () => window.removeEventListener('xdfc_storage_initialized', handleRefresh)
    }, [queryClient])

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
        deleteMutation
    }
}

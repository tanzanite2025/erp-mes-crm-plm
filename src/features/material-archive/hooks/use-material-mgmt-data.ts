import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type Material, type MaterialCategory } from '../data/schema'
import { deleteMaterial, getMaterials, saveMaterial } from '../services/material-service'

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
        mutationFn: saveMaterial,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['material-archive'] })
            toast.success('物料数据已同步')
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

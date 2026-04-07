import { useState } from 'react'
import { useGetQualityStandards, useQualityMutations } from './use-quality'
import { type Standard } from '../data/schema'
import { type DeltaSet } from '@/lib/delta/types'

export function useQualityStandardsMgmt() {
    const [page] = useState(1)
    const [pageSize] = useState(20)
    const [typeFilter] = useState('ALL')
    const { data, error, isLoading } = useGetQualityStandards(page, pageSize, typeFilter)
    const standards = data?.items || []
    const total = data?.total || 0
    const { saveStandardMutation } = useQualityMutations()

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStandard, setSelectedStandard] = useState<Standard | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isActionOpen, setIsActionOpen] = useState(false)
    const [actionStandard, setActionStandard] = useState<Standard | null>(null)

    const filteredStandards = standards.filter((standard: Standard) =>
        (standard.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (standard.code?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )

    const handleViewDetail = (standard: Standard) => {
        setSelectedStandard(standard)
        setIsDetailOpen(true)
    }

    const handleAdd = () => {
        setActionStandard(null)
        setIsActionOpen(true)
    }

    const handleEdit = (standard: Standard) => {
        setActionStandard(standard)
        setIsActionOpen(true)
    }

    const handleSaveStandard = (payload: { data: Partial<Standard>; isPatch: boolean; delta?: DeltaSet }) => {
        saveStandardMutation.mutate(payload)
        setIsActionOpen(false)
    }

    return {
        // Data states
        standards: filteredStandards,
        total,
        isLoading,
        error,
        
        // Search & Filter states
        searchQuery,
        setSearchQuery,
        
        // Dialog states
        isDetailOpen,
        setIsDetailOpen,
        isActionOpen,
        setIsActionOpen,
        selectedStandard,
        actionStandard,
        
        // Handlers
        handleViewDetail,
        handleAdd,
        handleEdit,
        handleSaveStandard,
        isMutationPending: saveStandardMutation.isPending
    }
}

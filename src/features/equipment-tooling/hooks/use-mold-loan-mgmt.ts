'use client'

import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type EquipmentPartner, type Mold, type MoldLoan } from '../data/schema'
import { MoldLoanService } from '../services/mold-loan-service'
import { MoldService } from '../services/mold-service'
import { EquipmentPartnerService } from '../services/partner-service'
import { AssetService } from '../services/asset-service'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { type DeltaSet } from '@/lib/delta/types'

export type LoanMode = 'LEND' | 'BORROW'

export function useMoldLoanMgmt() {
    const { t } = useLanguage()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const queryClient = useQueryClient()
    const homeFactory = t('equipmentTooling.loans.defaults.homeFactory')
    
    const [loans, setLoans] = useState<MoldLoan[]>([])
    const [molds, setMolds] = useState<Mold[]>([])
    const [partners, setPartners] = useState<EquipmentPartner[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<LoanMode>('LEND')
    const [currentRow, setCurrentRow] = useState<MoldLoan | null>(null)
    const [error, setError] = useState<unknown>(null)

    const loadData = useCallback(async () => {
        setError(null)
        try {
            const [loanRecords, moldRecords, partnerRecords] = await Promise.all([
                MoldLoanService.getLoans(),
                MoldService.getMolds(),
                EquipmentPartnerService.getPartners(),
            ])
            setLoans(loanRecords)
            setMolds(moldRecords.filter((mold) => mold.status === 'IDLE' || mold.status === 'LENT_OUT'))
            setPartners(partnerRecords)
        } catch (err) {
            setError(err)
        }
    }, [])

    const handleAddClick = (initialMode: LoanMode = 'LEND') => {
        setMode(initialMode)
        setCurrentRow(null)
        setIsOpen(true)
    }

    const handleEditClick = (row: MoldLoan) => {
        setCurrentRow(row)
        setIsOpen(true)
    }

    const mutation = useMutation({
        mutationFn: async ({ 
            data, 
            isPatch, 
            delta 
        }: { 
            data: MoldLoan; 
            isPatch?: boolean; 
            delta?: DeltaSet 
        }) => {
            if (isPatch && delta) {
                return MoldLoanService.patchLoan(data.id, delta, data.version)
            }
            if (mode === 'LEND') {
                return AssetService.lendMold(data)
            } else {
                // 构造借入模式需要的两部分数据
                const { maxCycles, currentCycles, maintenanceThreshold, ...loanBase } = data
                const moldData = {
                    sn: data.moldSn,
                    name: data.moldName,
                    maxCycles: maxCycles || 1000,
                    currentCycles: currentCycles || 0,
                    maintenanceThreshold: maintenanceThreshold || 800,
                    totalLifeCycles: currentCycles || 0,
                    description: `借入自 ${data.fromFactory}`,
                    isAlerted: false,
                    version: 1
                }
                return AssetService.borrowMold(loanBase, moldData)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moldLoans'] })
            queryClient.invalidateQueries({ queryKey: ['molds'] })
            toast.success(currentRow ? '记录已更新' : '记录已创建')
            setIsOpen(false)
            void loadData()
        },
        onError: (error: any) => {
            toast.error(error.message || '操作失败')
        }
    })

    const handleDialogSubmit = (data: MoldLoan, isPatch?: boolean, delta?: DeltaSet) => {
        mutation.mutate({ data, isPatch, delta })
    }

    const filteredLoans = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase()
        if (!keyword) return loans

        return loans.filter((loan) =>
            [loan.moldSn, loan.moldName, loan.contactPerson, loan.fromFactory, loan.toFactory]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(keyword))
        )
    }, [loans, searchTerm])

    const handleReturn = async (loanId: string) => {
        runConfirmedAction({
            permission: 'action_equipment_loan_manage',
            confirmKey: 'equipmentTooling.loans.confirm.return',
            onAction: async () => {
                await MoldLoanService.returnMold(loanId)
                toast.success(t('equipmentTooling.loans.toast.returned'))
                await loadData()
            },
        })
    }

    return {
        loans: filteredLoans,
        molds,
        partners,
        searchTerm,
        setSearchTerm,
        isOpen,
        setIsOpen,
        mode,
        setMode,
        currentRow,
        handleAddClick,
        handleEditClick,
        handleDialogSubmit,
        handleReturn,
        error,
        homeFactory
    }
}

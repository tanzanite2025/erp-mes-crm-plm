'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type EquipmentPartner, type Mold, type MoldLoan } from '../data/schema'
import { MoldLoanService } from '../services/mold-loan-service'
import { MoldService } from '../services/mold-service'
import { EquipmentPartnerService } from '../services/partner-service'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'

export type LoanMode = 'LEND' | 'BORROW'

export interface LoanDraft {
    moldId: string
    fromFactory: string
    toFactory: string
    contactPerson: string
    loanDate: string
    expectedReturnDate: string
    remarks: string
    photoUrl: string
    moldSn: string
    moldName: string
    maxCycles: number
    currentCycles: number
    maintenanceThreshold: number
}

function getToday() {
    return new Date().toISOString().split('T')[0] ?? ''
}

function createLoanDraft(homeFactory: string): LoanDraft {
    return {
        moldId: '',
        fromFactory: homeFactory,
        toFactory: '',
        contactPerson: '',
        loanDate: getToday(),
        expectedReturnDate: '',
        remarks: '',
        photoUrl: '',
        moldSn: '',
        moldName: '',
        maxCycles: 1000,
        currentCycles: 0,
        maintenanceThreshold: 800,
    }
}

export function useMoldLoanMgmt() {
    const { t } = useLanguage()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const homeFactory = t('equipmentTooling.loans.defaults.homeFactory')
    
    const [loans, setLoans] = useState<MoldLoan[]>([])
    const [molds, setMolds] = useState<Mold[]>([])
    const [partners, setPartners] = useState<EquipmentPartner[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [mode, setMode] = useState<LoanMode>('LEND')
    const [newLoan, setNewLoan] = useState<LoanDraft>(() => createLoanDraft(homeFactory))
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

    useEffect(() => {
        void loadData()
    }, [loadData])

    const resetDraft = (nextMode: LoanMode) => {
        const nextDraft = createLoanDraft(homeFactory)
        if (nextMode === 'BORROW') {
            nextDraft.toFactory = homeFactory
        }
        setMode(nextMode)
        setNewLoan(nextDraft)
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

    const handleCreateRecord = async () => {
        runConfirmedAction({
            permission: 'action_equipment_loan_manage',
            confirmKey: 'equipmentTooling.loans.confirm.createDescription',
            onAction: async () => {
                if (mode === 'LEND') {
                    const selectedMold = molds.find((mold) => mold.id === newLoan.moldId)
                    if (!selectedMold || !newLoan.toFactory || !newLoan.contactPerson || !newLoan.expectedReturnDate) {
                        toast.error(t('equipmentTooling.loans.validation.incompleteLend'))
                        return
                    }

                    await MoldLoanService.createLoan({
                        moldId: newLoan.moldId,
                        moldName: selectedMold.name,
                        moldSn: selectedMold.sn,
                        fromFactory: newLoan.fromFactory,
                        toFactory: newLoan.toFactory,
                        contactPerson: newLoan.contactPerson,
                        loanDate: new Date(newLoan.loanDate).toISOString(),
                        expectedReturnDate: new Date(newLoan.expectedReturnDate).toISOString(),
                        status: 'ACTIVE',
                        remarks: newLoan.remarks,
                        photoUrl: newLoan.photoUrl,
                    })

                    toast.success(t('equipmentTooling.loans.toast.createdLend'))
                } else {
                    if (!newLoan.moldSn || !newLoan.moldName || !newLoan.fromFactory || !newLoan.expectedReturnDate) {
                        toast.error(t('equipmentTooling.loans.validation.incompleteBorrow'))
                        return
                    }

                    await MoldLoanService.createBorrowRecord(
                        {
                            moldId: '',
                            moldName: newLoan.moldName,
                            moldSn: newLoan.moldSn,
                            fromFactory: newLoan.fromFactory,
                            toFactory: homeFactory,
                            contactPerson: newLoan.contactPerson,
                            loanDate: new Date(newLoan.loanDate).toISOString(),
                            expectedReturnDate: new Date(newLoan.expectedReturnDate).toISOString(),
                            status: 'ACTIVE',
                            remarks: newLoan.remarks,
                            photoUrl: newLoan.photoUrl,
                        },
                        {
                            sn: newLoan.moldSn,
                            name: newLoan.moldName,
                            maxCycles: newLoan.maxCycles,
                            currentCycles: newLoan.currentCycles,
                            maintenanceThreshold: newLoan.maintenanceThreshold,
                            totalLifeCycles: newLoan.currentCycles,
                            description: t('equipmentTooling.loans.borrow.autoDescription', { fromFactory: newLoan.fromFactory }),
                            isAlerted: false,
                        }
                    )

                    toast.success(t('equipmentTooling.loans.toast.createdBorrow'))
                }

                setIsDialogOpen(false)
                resetDraft(mode)
                await loadData()
            }
        })
    }

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
        isDialogOpen,
        setIsDialogOpen,
        mode,
        setMode,
        newLoan,
        setNewLoan,
        error,
        handleCreateRecord,
        handleReturn,
        resetDraft,
        homeFactory
    }
}

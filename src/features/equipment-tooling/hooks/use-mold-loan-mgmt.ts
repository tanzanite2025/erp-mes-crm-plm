'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { type Mold, type MoldLoan } from '../data/schema'
import { AssetService } from '../services/asset-service'
import { MoldCoreService } from '../services/mold-core-service'
import { MoldLoanService } from '../services/mold-loan-service'
import { EquipmentPartnerService } from '../services/partner-service'
import { MOLD_LOANS_QUERY_KEY, MOLDS_QUERY_KEY } from './use-assets'

export type LoanMode = 'LEND' | 'BORROW'
const EQUIPMENT_PARTNERS_QUERY_KEY = ['equipmentPartners'] as const

function requireNumber(value: number | undefined, context: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    const error = new Error(`[CRITICAL] Missing ${context}`)
    failLoudly(error, 'useMoldLoanMgmt.requireNumber')
    throw error
  }
  return value
}

function requireString(value: string | undefined, context: string) {
  if (!value) {
    const error = new Error(`[CRITICAL] Missing ${context}`)
    failLoudly(error, 'useMoldLoanMgmt.requireString')
    throw error
  }
  return value
}

export function useMoldLoanMgmt() {
  const { t } = useLanguage()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const queryClient = useQueryClient()
  const homeFactory = t('equipmentTooling.loans.defaults.homeFactory')

  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<LoanMode>('LEND')
  const [currentRow, setCurrentRow] = useState<MoldLoan | null>(null)

  const loansQuery = useQuery({
    queryKey: MOLD_LOANS_QUERY_KEY,
    queryFn: () => MoldLoanService.getLoans(),
  })

  const moldsQuery = useQuery({
    queryKey: MOLDS_QUERY_KEY,
    queryFn: () => MoldCoreService.getMolds(),
  })

  const partnersQuery = useQuery({
    queryKey: EQUIPMENT_PARTNERS_QUERY_KEY,
    queryFn: () => EquipmentPartnerService.getPartners(),
  })

  const loans = useMemo(() => {
    if (loansQuery.isLoading) return []
    if (!loansQuery.data) {
      const error = new Error('[CRITICAL] Mold loans missing after load')
      failLoudly(error, 'useMoldLoanMgmt.loans')
      throw error
    }
    return loansQuery.data
  }, [loansQuery.data, loansQuery.isLoading])

  const molds = useMemo(() => {
    if (moldsQuery.isLoading) return []
    if (!moldsQuery.data) {
      const error = new Error('[CRITICAL] Molds missing after load')
      failLoudly(error, 'useMoldLoanMgmt.molds')
      throw error
    }
    return moldsQuery.data.filter(
      (mold: Mold) => mold.status === 'IDLE' || mold.status === 'LENT_OUT'
    )
  }, [moldsQuery.data, moldsQuery.isLoading])

  const partners = useMemo(() => {
    if (partnersQuery.isLoading) return []
    if (!partnersQuery.data) {
      const error = new Error(
        '[CRITICAL] Equipment partners missing after load'
      )
      failLoudly(error, 'useMoldLoanMgmt.partners')
      throw error
    }
    return partnersQuery.data
  }, [partnersQuery.data, partnersQuery.isLoading])

  const error = loansQuery.error ?? moldsQuery.error ?? partnersQuery.error

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
      delta,
    }: {
      data: MoldLoan
      isPatch?: boolean
      delta?: DeltaSet
    }) => {
      if (isPatch && delta) {
        return MoldLoanService.patchLoan(data.id, delta, data.version)
      }
      if (mode === 'LEND') {
        return AssetService.lendMold(data)
      }

      const { maxCycles, currentCycles, ...loanBase } = data
      const resolvedMaxCycles = requireNumber(maxCycles, 'mold maxCycles')
      const resolvedCurrentCycles = requireNumber(
        currentCycles,
        'mold currentCycles'
      )
      const moldData = {
        sn: requireString(data.moldSn, 'mold sn'),
        name: requireString(data.moldName, 'mold name'),
        maxCycles: resolvedMaxCycles,
        currentCycles: resolvedCurrentCycles,
      }
      return AssetService.borrowMold(loanBase, moldData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOLD_LOANS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: MOLDS_QUERY_KEY })
      toast.success(currentRow ? 'Record updated.' : 'Record created.')
      setIsOpen(false)
    },
    onError: (mutationError: unknown) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : 'Operation failed'
      )
    },
  })

  const handleDialogSubmit = (
    data: MoldLoan,
    isPatch?: boolean,
    delta?: DeltaSet
  ) => {
    mutation.mutate({ data, isPatch, delta })
  }

  const filteredLoans = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return loans

    return loans.filter((loan) =>
      [
        loan.moldSn,
        loan.moldName,
        loan.contactPerson,
        loan.fromFactory,
        loan.toFactory,
      ]
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
        queryClient.invalidateQueries({ queryKey: MOLD_LOANS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: MOLDS_QUERY_KEY })
        toast.success(t('equipmentTooling.loans.toast.returned'))
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
    homeFactory,
  }
}

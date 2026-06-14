import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { SettlementAllocationDraft } from '../services/settlement-record-payload'

export interface UseSettlementRecordDialogStateResult {
  paymentMethod: string
  setPaymentMethod: (value: string) => void
  recordDate: string
  setRecordDate: (value: string) => void
  receivedAt: string
  setReceivedAt: (value: string) => void
  receiptAccount: string
  setReceiptAccount: (value: string) => void
  referenceNo: string
  setReferenceNo: (value: string) => void
  allocations: SettlementAllocationDraft[]
  setAllocations: Dispatch<SetStateAction<SettlementAllocationDraft[]>>
  ledgerSearchTerm: string
  setLedgerSearchTerm: (value: string) => void
  debouncedLedgerSearchTerm: string
  ledgerStatusFilter: string
  setLedgerStatusFilter: (value: string) => void
  ledgerCurrencyFilter: string
  setLedgerCurrencyFilter: (value: string) => void
  ledgerOutstandingMin: string
  setLedgerOutstandingMin: (value: string) => void
  ledgerOutstandingMax: string
  setLedgerOutstandingMax: (value: string) => void
  ledgerSortBy: string
  setLedgerSortBy: (value: string) => void
  ledgerSortOrder: string
  setLedgerSortOrder: (value: string) => void
  isLedgerSearchDialogOpen: boolean
  setIsLedgerSearchDialogOpen: Dispatch<SetStateAction<boolean>>
  activeAllocationSequenceNo: number | null
  historySearchTerm: string
  setHistorySearchTerm: (value: string) => void
  selectedRecordId: string | null
  setSelectedRecordId: (value: string | null) => void
  showOnlyMissingEvidenceRecords: boolean
  setShowOnlyMissingEvidenceRecords: Dispatch<SetStateAction<boolean>>
  totalAllocatedAmount: number
  canSubmit: boolean
  resetForm: () => void
  addAllocationRow: () => void
  removeAllocationRow: (sequenceNo: number) => void
  updateAllocationRow: (
    sequenceNo: number,
    patch: Partial<SettlementAllocationDraft>
  ) => void
  openLedgerSearchDialog: (sequenceNo: number) => void
  activeAllocation: SettlementAllocationDraft | null
  handleLedgerSelected: (selectedLedgerId: string) => void
}

function buildDefaultAllocations(
  ledgerId: string | null
): SettlementAllocationDraft[] {
  return ledgerId
    ? [{ ledgerId, allocatedAmount: '', remark: '', sequenceNo: 1 }]
    : []
}

export function useSettlementRecordDialogState(
  ledgerId: string | null
): UseSettlementRecordDialogStateResult {
  const [paymentMethod, setPaymentMethod] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [receivedAt, setReceivedAt] = useState('')
  const [receiptAccount, setReceiptAccount] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [allocations, setAllocations] = useState<SettlementAllocationDraft[]>(
    () => buildDefaultAllocations(ledgerId)
  )
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('')
  const [debouncedLedgerSearchTerm, setDebouncedLedgerSearchTerm] = useState('')
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('')
  const [ledgerCurrencyFilter, setLedgerCurrencyFilter] = useState('')
  const [ledgerOutstandingMin, setLedgerOutstandingMin] = useState('')
  const [ledgerOutstandingMax, setLedgerOutstandingMax] = useState('')
  const [ledgerSortBy, setLedgerSortBy] = useState('updated_at')
  const [ledgerSortOrder, setLedgerSortOrder] = useState('desc')
  const [isLedgerSearchDialogOpen, setIsLedgerSearchDialogOpen] =
    useState(false)
  const [activeAllocationSequenceNo, setActiveAllocationSequenceNo] = useState<
    number | null
  >(null)
  const [historySearchTerm, setHistorySearchTerm] = useState('')
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [showOnlyMissingEvidenceRecords, setShowOnlyMissingEvidenceRecords] =
    useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLedgerSearchTerm(ledgerSearchTerm.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [ledgerSearchTerm])

  const totalAllocatedAmount = useMemo(
    () =>
      allocations.reduce(
        (sum, item) => sum + (Number(item.allocatedAmount) || 0),
        0
      ),
    [allocations]
  )

  const canSubmit = useMemo(
    () =>
      allocations.length > 0 &&
      totalAllocatedAmount > 0 &&
      allocations.every(
        (item) => Number(item.allocatedAmount) > 0 && item.ledgerId
      ),
    [allocations, totalAllocatedAmount]
  )

  const resetForm = () => {
    setPaymentMethod('')
    setRecordDate('')
    setReceivedAt('')
    setReceiptAccount('')
    setReferenceNo('')
    setAllocations(buildDefaultAllocations(ledgerId))
    setLedgerSearchTerm('')
    setDebouncedLedgerSearchTerm('')
    setLedgerStatusFilter('')
    setLedgerCurrencyFilter('')
    setLedgerOutstandingMin('')
    setLedgerOutstandingMax('')
    setLedgerSortBy('updated_at')
    setLedgerSortOrder('desc')
    setIsLedgerSearchDialogOpen(false)
    setActiveAllocationSequenceNo(null)
    setHistorySearchTerm('')
    setSelectedRecordId(null)
    setShowOnlyMissingEvidenceRecords(false)
  }

  const addAllocationRow = () => {
    setAllocations((current) => [
      ...current,
      {
        ledgerId: ledgerId ?? '',
        allocatedAmount: '',
        remark: '',
        sequenceNo: current.length + 1,
      },
    ])
  }

  const removeAllocationRow = (sequenceNo: number) => {
    setAllocations((current) =>
      current
        .filter((item) => item.sequenceNo !== sequenceNo)
        .map((item, index) => ({ ...item, sequenceNo: index + 1 }))
    )
  }

  const updateAllocationRow = (
    sequenceNo: number,
    patch: Partial<SettlementAllocationDraft>
  ) => {
    setAllocations((current) =>
      current.map((item) =>
        item.sequenceNo === sequenceNo ? { ...item, ...patch } : item
      )
    )
  }

  const openLedgerSearchDialog = (sequenceNo: number) => {
    setActiveAllocationSequenceNo(sequenceNo)
    setIsLedgerSearchDialogOpen(true)
  }

  const activeAllocation = useMemo(
    () =>
      allocations.find(
        (item) => item.sequenceNo === activeAllocationSequenceNo
      ) ?? null,
    [activeAllocationSequenceNo, allocations]
  )

  const handleLedgerSelected = (selectedLedgerId: string) => {
    if (!activeAllocationSequenceNo) {
      return
    }
    updateAllocationRow(activeAllocationSequenceNo, {
      ledgerId: selectedLedgerId,
    })
    setIsLedgerSearchDialogOpen(false)
    setActiveAllocationSequenceNo(null)
  }

  return {
    paymentMethod,
    setPaymentMethod,
    recordDate,
    setRecordDate,
    receivedAt,
    setReceivedAt,
    receiptAccount,
    setReceiptAccount,
    referenceNo,
    setReferenceNo,
    allocations,
    setAllocations,
    ledgerSearchTerm,
    setLedgerSearchTerm,
    debouncedLedgerSearchTerm,
    ledgerStatusFilter,
    setLedgerStatusFilter,
    ledgerCurrencyFilter,
    setLedgerCurrencyFilter,
    ledgerOutstandingMin,
    setLedgerOutstandingMin,
    ledgerOutstandingMax,
    setLedgerOutstandingMax,
    ledgerSortBy,
    setLedgerSortBy,
    ledgerSortOrder,
    setLedgerSortOrder,
    isLedgerSearchDialogOpen,
    setIsLedgerSearchDialogOpen,
    activeAllocationSequenceNo,
    historySearchTerm,
    setHistorySearchTerm,
    selectedRecordId,
    setSelectedRecordId,
    showOnlyMissingEvidenceRecords,
    setShowOnlyMissingEvidenceRecords,
    totalAllocatedAmount,
    canSubmit,
    resetForm,
    addAllocationRow,
    removeAllocationRow,
    updateAllocationRow,
    openLedgerSearchDialog,
    activeAllocation,
    handleLedgerSelected,
  }
}

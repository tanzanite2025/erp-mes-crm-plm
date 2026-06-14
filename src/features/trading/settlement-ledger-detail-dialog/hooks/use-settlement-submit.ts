import {
  buildSettlementRecordPayload,
  type SettlementAllocationDraft,
} from '../services/settlement-record-payload'

interface UseSettlementSubmitParams {
  ledgerId: string | null
  totalAllocatedAmount: number
  allocations: SettlementAllocationDraft[]
  paymentMethod: string
  recordDate: string
  receivedAt: string
  receiptAccount: string
  referenceNo: string
  resetForm: () => void
  onOpenChange: (open: boolean) => void
  onSubmit: (
    payload: ReturnType<typeof buildSettlementRecordPayload>
  ) => Promise<void>
}

export function useSettlementSubmit({
  ledgerId,
  totalAllocatedAmount,
  allocations,
  paymentMethod,
  recordDate,
  receivedAt,
  receiptAccount,
  referenceNo,
  resetForm,
  onOpenChange,
  onSubmit,
}: UseSettlementSubmitParams) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    if (!ledgerId || totalAllocatedAmount <= 0 || allocations.length === 0) {
      return
    }

    await onSubmit(
      buildSettlementRecordPayload({
        amount: totalAllocatedAmount,
        paymentMethod,
        recordDate,
        receivedAt,
        receiptAccount,
        referenceNo,
        allocations,
      })
    )

    resetForm()
  }

  return {
    handleOpenChange,
    handleSubmit,
  }
}

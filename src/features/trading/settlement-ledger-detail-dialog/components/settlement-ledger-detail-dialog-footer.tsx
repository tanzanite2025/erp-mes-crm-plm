import { Button } from '@/components/ui/button'

import type { SettlementLedgerDetailDialogViewModel } from '../types'

interface SettlementLedgerDetailDialogFooterProps {
  vm: Pick<SettlementLedgerDetailDialogViewModel, 'canSubmit' | 'handleOpenChange' | 'handleSubmit'>
  actionLabel: string
  isSubmitPending: boolean
  isDetailLoading: boolean
}

export function SettlementLedgerDetailDialogFooter({
  vm,
  actionLabel,
  isSubmitPending,
  isDetailLoading,
}: SettlementLedgerDetailDialogFooterProps) {
  return (
    <>
      <Button
        variant='outline'
        className='h-10 rounded-full border-dashed px-5 text-[10px] font-black tracking-[0.14em]'
        onClick={() => vm.handleOpenChange(false)}
      >
        关闭
      </Button>
      <Button
        className='h-10 rounded-full px-5 text-[10px] font-black tracking-[0.14em]'
        onClick={() => void vm.handleSubmit()}
        disabled={!vm.canSubmit || isSubmitPending || isDetailLoading}
      >
        {`登记${actionLabel}`}
      </Button>
    </>
  )
}

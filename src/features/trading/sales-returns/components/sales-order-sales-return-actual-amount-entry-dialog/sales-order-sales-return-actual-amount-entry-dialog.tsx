import { useMemo, useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { OrderEvidence } from '@/features/trading/data/schema'
import { useSalesReturnMutations } from '@/features/trading/sales/hooks/use-sales-returns'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'
import { SalesReturnActualAmountRecordEditorContent } from '../sales-return-actual-amount-records/sales-return-actual-amount-record-editor-content'

type SalesOrderSalesReturnActualAmountEntryDialogProps = {
  record?: SalesReturnRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatAmountValue(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

export function SalesOrderSalesReturnActualAmountEntryDialog({
  record,
  open,
  onOpenChange,
}: SalesOrderSalesReturnActualAmountEntryDialogProps) {
  const { t } = useLanguage()
  const { patchActualAmountEntryMutation } = useSalesReturnMutations()
  const [actualAmount, setActualAmount] = useState(() => {
    if (!record) {
      return '0.00'
    }
    return formatAmountValue(
      record.actualReturnAmountRecordedAt
        ? record.actualReturnAmount
        : record.totalAmount
    )
  })
  const [actualAmountNote, setActualAmountNote] = useState(
    () => record?.actualReturnAmountNote ?? ''
  )
  const [actualAmountEvidences, setActualAmountEvidences] = useState<OrderEvidence[]>(
    () => record?.actualReturnAmountEvidences ?? []
  )

  const parsedActualAmount = useMemo(() => {
    const value = Number(actualAmount)
    return Number.isFinite(value) ? value : NaN
  }, [actualAmount])

  if (!record) {
    return null
  }

  const handleSubmit = () => {
    if (!Number.isFinite(parsedActualAmount) || parsedActualAmount < 0) {
      return
    }

    patchActualAmountEntryMutation.mutate(
      {
        salesReturnId: record.id,
        payload: {
          actualReturnAmount: parsedActualAmount,
          actualReturnAmountNote: actualAmountNote.trim() || undefined,
          actualReturnAmountEvidences:
            actualAmountEvidences.length > 0 ? actualAmountEvidences : undefined,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className='w-[calc(100vw-24px)] max-w-[960px] rounded-[32px] border-none bg-background p-0 shadow-2xl'
      >
        <DialogHeader className='border-b border-dashed border-border/70 px-6 py-5 text-left'>
          <DialogTitle className='text-lg font-black tracking-tighter italic uppercase'>
            {t('trading.salesReturns.actualAmountEntryDialog.title')}
          </DialogTitle>
          <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
            {t('trading.salesReturns.actualAmountEntryDialog.description', {
              returnNo: record.returnNo,
            })}
          </DialogDescription>
        </DialogHeader>

        <SalesReturnActualAmountRecordEditorContent
          record={record}
          actualAmount={actualAmount}
          actualAmountNote={actualAmountNote}
          actualAmountEvidences={actualAmountEvidences}
          onActualAmountChange={setActualAmount}
          onActualAmountNoteChange={setActualAmountNote}
          onActualAmountEvidencesChange={setActualAmountEvidences}
        />

        <DialogFooter className='border-t border-dashed border-border/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-end'>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              type='button'
              className='h-11 rounded-full text-[10px] font-black uppercase tracking-widest'
              onClick={handleSubmit}
              disabled={
                patchActualAmountEntryMutation.isPending ||
                !Number.isFinite(parsedActualAmount) ||
                parsedActualAmount < 0
              }
            >
              {patchActualAmountEntryMutation.isPending
                ? t('common.actions.loading')
                : t('trading.salesReturns.actualAmountEntryDialog.submit')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

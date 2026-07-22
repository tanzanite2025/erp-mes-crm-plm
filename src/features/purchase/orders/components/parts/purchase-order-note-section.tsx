import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type PurchaseOrder } from '../../data/schema'

type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]

interface PurchaseOrderNoteSectionProps {
  note: string | undefined
  handleHeaderChange: (
    field: keyof PurchaseOrder,
    value: PurchaseOrderFieldValue
  ) => void
  className?: string
  variant?: 'card' | 'field'
}

export function PurchaseOrderNoteSection({
  note,
  handleHeaderChange,
  className,
  variant = 'card',
}: PurchaseOrderNoteSectionProps) {
  const { t } = useLanguage()
  const isField = variant === 'field'

  return (
    <div
      className={cn(
        'space-y-1.5',
        isField
          ? ''
          : 'rounded-[32px] border border-dashed border-muted-foreground/20 bg-muted/5 p-5',
        className
      )}
    >
      <Label className='pl-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
        {t('purchase.orders.headerFields.note')}
      </Label>
      {isField ? (
        <Input
          placeholder={t('purchase.orders.headerFields.notePlaceholder')}
          value={note}
          onChange={(e) => handleHeaderChange('note', e.target.value)}
          className='h-10 rounded-2xl border-none bg-background font-bold shadow-sm'
        />
      ) : (
        <Textarea
          placeholder={t('purchase.orders.headerFields.notePlaceholder')}
          value={note}
          onChange={(e) => handleHeaderChange('note', e.target.value)}
          className={cn(
            'resize-none rounded-2xl border-none bg-background p-4 font-bold shadow-sm',
            'min-h-[80px]'
          )}
        />
      )}
    </div>
  )
}

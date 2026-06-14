import { DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ProductBindingHistoryTable } from './product-binding-history-table'

type ProductBindingHistoryDialogContentProps = {
  title: string
  items: Parameters<typeof ProductBindingHistoryTable>[0]['items']
  isLoading: boolean
  error: Error | null
  latestBindingId: string
  historyTotal: number
}

export function ProductBindingHistoryDialogContent(
  props: ProductBindingHistoryDialogContentProps
) {
  const { title, items, isLoading, error, latestBindingId, historyTotal } =
    props

  return (
    <DialogContent
      size='full'
      className='h-[90dvh] w-[85vw] max-w-[85vw] gap-0 overflow-hidden rounded-[32px] border-none bg-background p-2 shadow-2xl sm:p-3'
    >
      <DialogTitle className='sr-only'>{title}</DialogTitle>
      <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />
      <div className='relative h-full min-h-0 overflow-hidden'>
        <ProductBindingHistoryTable
          items={items}
          isLoading={isLoading}
          error={error}
          latestBindingId={latestBindingId}
          historyTotal={historyTotal}
        />
      </div>
    </DialogContent>
  )
}

import { type ComponentProps, type ReactElement } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import type { ProductBindingHistoryQuery } from '../services/product-binding-service'
import { useProductBindingHistoryDialogState } from '../hooks/use-product-binding-history-dialog-state'
import { ProductBindingHistoryDialogContent } from './product-binding-history-dialog-content'

export type ProductBindingHistoryDialogRenderTriggerContext = {
  open: boolean
  setOpen: (open: boolean) => void
  recordCount: number
}

export type ProductBindingHistoryDialogProps = {
  defaultFilters?: ProductBindingHistoryQuery
  latestBindingId?: string
  triggerLabel?: string
  triggerButtonProps?: Omit<ComponentProps<typeof Button>, 'children' | 'type'>
  prefetchRecordCount?: boolean
  triggerNode?: ReactElement
  renderTrigger?: (
    context: ProductBindingHistoryDialogRenderTriggerContext,
  ) => ReactElement
}

export function ProductBindingHistoryDialog(props: ProductBindingHistoryDialogProps) {
  const { t } = useLanguage()
  const {
    triggerLabel,
    triggerButtonProps,
    defaultFilters,
    latestBindingId = '',
    prefetchRecordCount,
    triggerNode,
    renderTrigger,
  } = props
  const {
    className: triggerClassName,
    variant: triggerVariant,
    ...restTriggerButtonProps
  } = triggerButtonProps ?? {}
  const { open, setOpen, historyQuery, recordCount } = useProductBindingHistoryDialogState({
    defaultFilters,
    prefetchRecordCount,
    hasRenderTrigger: Boolean(renderTrigger),
  })
  const triggerContent = renderTrigger
    ? renderTrigger({ open, setOpen, recordCount })
    : triggerNode ?? (
        <Button
          type='button'
          variant={triggerVariant ?? 'outline'}
          className={cn(
            'h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-widest',
            triggerClassName,
          )}
          {...restTriggerButtonProps}
        >
          <History className='size-4' />
          {triggerLabel || t('cuttingOperations.productBinding.history.actions.openDialog')}
        </Button>
      )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerContent}
      </DialogTrigger>

      <ProductBindingHistoryDialogContent
        title={t('cuttingOperations.productBinding.history.title')}
        items={historyQuery.data?.items ?? []}
        isLoading={historyQuery.isLoading}
        error={historyQuery.error instanceof Error ? historyQuery.error : null}
        latestBindingId={latestBindingId}
        historyTotal={recordCount}
      />
    </Dialog>
  )
}

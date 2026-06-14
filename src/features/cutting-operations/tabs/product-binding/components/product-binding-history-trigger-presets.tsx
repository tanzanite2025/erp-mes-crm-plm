import type { ReactElement } from 'react'
import { History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ProductBindingHistoryDialog,
  type ProductBindingHistoryDialogProps,
  type ProductBindingHistoryDialogRenderTriggerContext,
} from './product-binding-history-dialog'

type BaseHistoryTriggerProps = Omit<
  ProductBindingHistoryDialogProps,
  'triggerLabel' | 'triggerButtonProps' | 'triggerNode' | 'renderTrigger'
>

type HistoryTriggerDialogPresetProps = BaseHistoryTriggerProps & {
  prefetchRecordCount?: boolean
  renderTrigger: (
    context: ProductBindingHistoryDialogRenderTriggerContext
  ) => ReactElement
}

function HistoryTriggerDialogPreset(props: HistoryTriggerDialogPresetProps) {
  const { prefetchRecordCount, renderTrigger, ...dialogProps } = props

  return (
    <ProductBindingHistoryDialog
      {...dialogProps}
      prefetchRecordCount={prefetchRecordCount}
      renderTrigger={renderTrigger}
    />
  )
}

type HistoryTriggerCountBadgeProps = {
  recordCount: number
  className?: string
}

function HistoryTriggerCountBadge(props: HistoryTriggerCountBadgeProps) {
  const { recordCount, className } = props

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-mono tracking-[0.16em] uppercase',
        className
      )}
    >
      {recordCount}
    </span>
  )
}

export type HistoryBadgeTriggerProps = BaseHistoryTriggerProps & {
  label?: string
  className?: string
}

export function HistoryBadgeTrigger(props: HistoryBadgeTriggerProps) {
  const { t } = useLanguage()
  const { label, className, ...dialogProps } = props

  return (
    <HistoryTriggerDialogPreset
      {...dialogProps}
      renderTrigger={({ open, recordCount }) => (
        <Badge
          asChild
          variant='outline'
          className={cn(
            'h-5 rounded-full border-dashed bg-background/90 px-2.5 font-mono text-[8px] tracking-[0.16em] uppercase',
            open
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/60 text-foreground/80',
            className
          )}
        >
          <button type='button'>
            <History className='size-3' />
            <span>
              {label || t('cuttingOperations.productBinding.history.title')}
            </span>
            <HistoryTriggerCountBadge
              recordCount={recordCount}
              className='text-[8px]'
            />
          </button>
        </Badge>
      )}
    />
  )
}

export type HistoryCardTriggerProps = BaseHistoryTriggerProps & {
  title?: string
  description?: string
  className?: string
}

export function HistoryCardTrigger(props: HistoryCardTriggerProps) {
  const { t } = useLanguage()
  const { title, description, className, ...dialogProps } = props

  return (
    <HistoryTriggerDialogPreset
      {...dialogProps}
      renderTrigger={({ open, recordCount }) => (
        <button
          type='button'
          className={cn(
            'relative w-full overflow-hidden rounded-[24px] border border-dashed border-border/70 bg-background p-4 text-left transition-colors',
            open
              ? 'border-primary/40 bg-primary/5'
              : 'hover:border-primary/30 hover:bg-primary/5',
            className
          )}
        >
          <span className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />
          <span className='relative flex items-start justify-between gap-4'>
            <span className='flex min-w-0 flex-col gap-1'>
              <span className='flex items-center gap-2 text-sm font-black tracking-tighter text-foreground italic'>
                <History className='size-4 text-primary' />
                {title || t('cuttingOperations.productBinding.history.title')}
              </span>
              <span className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {description ||
                  t('cuttingOperations.productBinding.history.description', {
                    count: recordCount,
                  })}
              </span>
            </span>
            <HistoryTriggerCountBadge
              recordCount={recordCount}
              className='h-5 min-w-8 rounded-full bg-primary/10 px-2 text-[8px] text-primary'
            />
          </span>
        </button>
      )}
    />
  )
}

export type HistoryTableActionTriggerProps = BaseHistoryTriggerProps & {
  label?: string
  className?: string
  showCount?: boolean
}

export function HistoryTableActionTrigger(
  props: HistoryTableActionTriggerProps
) {
  const { t } = useLanguage()
  const { label, className, showCount = false, ...dialogProps } = props

  return (
    <HistoryTriggerDialogPreset
      {...dialogProps}
      prefetchRecordCount={showCount}
      renderTrigger={({ open, recordCount }) => (
        <Button
          type='button'
          variant='ghost'
          className={cn(
            'h-8 rounded-full px-3 text-[10px] font-black tracking-widest uppercase',
            open ? 'bg-primary/10 text-primary hover:bg-primary/15' : '',
            className
          )}
        >
          <History className='size-3.5' />
          {label ||
            t('cuttingOperations.productBinding.history.actions.openDialog')}
          {showCount ? (
            <HistoryTriggerCountBadge
              recordCount={recordCount}
              className='h-4 rounded-full bg-muted px-1.5 text-[8px] text-foreground/70'
            />
          ) : null}
        </Button>
      )}
    />
  )
}

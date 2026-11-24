import { CheckCircle2, RotateCcw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import type { SidebarCommandAccount } from '../types'

type AssignmentSummaryProps = {
  selectedAccount?: SidebarCommandAccount
  hasSelectedAccount: boolean
  assignedCount: number
  assignedCategoryCount: number
  directCommandCount: number
  assignableCount: number
  selectedTargetCount: number
  isFetchingAssignment: boolean
  onSelectAll: () => void
  onClear: () => void
}

export function AssignmentSummary({
  selectedAccount,
  hasSelectedAccount,
  assignedCount,
  assignedCategoryCount,
  directCommandCount,
  assignableCount,
  selectedTargetCount,
  isFetchingAssignment,
  onSelectAll,
  onClear,
}: AssignmentSummaryProps) {
  const { t } = useLanguage()

  return (
    <div className='rounded-2xl border border-dashed border-muted/50 bg-background px-3 py-2.5 shadow-inner'>
      <div className='flex min-w-0 flex-wrap items-center justify-between gap-2'>
        <div className='min-w-0'>
          <p className='text-[9px] font-black tracking-[0.18em] text-muted-foreground/50 uppercase'>
            {t('sidebarCommandConfig.summary.currentAccount')}
          </p>
          <h2 className='truncate text-base font-black tracking-tighter'>
            {selectedAccount?.name || '-'}
            <span className='ml-2 text-xs font-black tracking-tight text-muted-foreground/60'>
              @{selectedAccount?.username || '-'}
            </span>
          </h2>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='outline'
            className='control-typography-compact h-7 gap-1.5 rounded-full border-dashed px-3'
            disabled={!hasSelectedAccount}
            onClick={onSelectAll}
          >
            <CheckCircle2 className='size-3' />
            {t('sidebarCommandConfig.summary.selectAll')}
          </Button>
          <Button
            variant='ghost'
            className='control-typography-compact h-7 gap-1.5 rounded-full px-3'
            disabled={!hasSelectedAccount}
            onClick={onClear}
          >
            <RotateCcw className='size-3' />
            {t('sidebarCommandConfig.summary.clear')}
          </Button>
        </div>
      </div>

      <div className='mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-1.5'>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.assigned')}
          </p>
          <p className='text-base font-black tracking-tighter tabular-nums'>
            {isFetchingAssignment ? '...' : assignedCount}
          </p>
        </div>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.categories')}
          </p>
          <p className='text-base font-black tracking-tighter tabular-nums'>
            {isFetchingAssignment ? '...' : assignedCategoryCount}
          </p>
        </div>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.directCommands')}
          </p>
          <p className='text-base font-black tracking-tighter tabular-nums'>
            {isFetchingAssignment ? '...' : directCommandCount}
          </p>
        </div>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.assignablePool')}
          </p>
          <p className='text-base font-black tracking-tighter tabular-nums'>
            {assignableCount}
          </p>
        </div>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.batchTargets')}
          </p>
          <p className='text-base font-black tracking-tighter tabular-nums'>
            {selectedTargetCount}
          </p>
        </div>
      </div>
    </div>
  )
}

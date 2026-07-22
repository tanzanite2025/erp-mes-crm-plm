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
      <div className='flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
        <div className='min-w-0'>
          <p className='text-[9px] font-black tracking-[0.18em] text-muted-foreground/50 uppercase'>
            {t('sidebarCommandConfig.summary.currentAccount')}
          </p>
          <h2 className='truncate text-base font-black tracking-tighter italic'>
            {selectedAccount?.name || '-'}
            <span className='ml-2 text-xs font-black tracking-tight text-muted-foreground/60'>
              @{selectedAccount?.username || '-'}
            </span>
          </h2>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='outline'
            className='h-7 gap-1.5 rounded-full border-dashed px-3 text-[9px] font-black tracking-widest'
            disabled={!hasSelectedAccount}
            onClick={onSelectAll}
          >
            <CheckCircle2 className='size-3' />
            {t('sidebarCommandConfig.summary.selectAll')}
          </Button>
          <Button
            variant='ghost'
            className='h-7 gap-1.5 rounded-full px-3 text-[9px] font-black tracking-widest'
            disabled={!hasSelectedAccount}
            onClick={onClear}
          >
            <RotateCcw className='size-3' />
            {t('sidebarCommandConfig.summary.clear')}
          </Button>
        </div>
      </div>

      <div className='mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-5'>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.assigned')}
          </p>
          <p className='text-base font-black tracking-tighter italic tabular-nums'>
            {isFetchingAssignment ? '...' : assignedCount}
          </p>
        </div>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.categories')}
          </p>
          <p className='text-base font-black tracking-tighter italic tabular-nums'>
            {isFetchingAssignment ? '...' : assignedCategoryCount}
          </p>
        </div>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.directCommands')}
          </p>
          <p className='text-base font-black tracking-tighter italic tabular-nums'>
            {isFetchingAssignment ? '...' : directCommandCount}
          </p>
        </div>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.assignablePool')}
          </p>
          <p className='text-base font-black tracking-tighter italic tabular-nums'>
            {assignableCount}
          </p>
        </div>
        <div className='flex items-center justify-between gap-2 rounded-full bg-muted/25 px-2.5 py-1.5'>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.summary.batchTargets')}
          </p>
          <p className='text-base font-black tracking-tighter italic tabular-nums'>
            {selectedTargetCount}
          </p>
        </div>
      </div>
    </div>
  )
}

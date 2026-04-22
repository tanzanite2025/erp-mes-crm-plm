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
    <div className='rounded-[32px] border border-dashed border-muted/50 bg-background p-5 shadow-inner'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='min-w-0'>
          <p className='text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
            {t('sidebarCommandAssignment.summary.currentAccount')}
          </p>
          <h2 className='mt-2 truncate text-xl font-black tracking-tighter italic'>
            {selectedAccount?.name || '-'}
            <span className='ml-2 text-sm font-black tracking-tight text-muted-foreground/60'>
              @{selectedAccount?.username || '-'}
            </span>
          </h2>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='outline'
            className='h-10 gap-2 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest'
            disabled={!hasSelectedAccount}
            onClick={onSelectAll}
          >
            <CheckCircle2 className='size-4' />
            {t('sidebarCommandAssignment.summary.selectAll')}
          </Button>
          <Button
            variant='ghost'
            className='h-10 gap-2 rounded-full px-5 text-[10px] font-black tracking-widest'
            disabled={!hasSelectedAccount}
            onClick={onClear}
          >
            <RotateCcw className='size-4' />
            {t('sidebarCommandAssignment.summary.clear')}
          </Button>
        </div>
      </div>

      <div className='mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        <div className='rounded-[24px] bg-muted/25 p-4'>
          <p className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.summary.assigned')}
          </p>
          <p className='mt-2 text-2xl font-black tracking-tighter italic tabular-nums'>
            {isFetchingAssignment ? '...' : assignedCount}
          </p>
        </div>
        <div className='rounded-[24px] bg-muted/25 p-4'>
          <p className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.summary.categories')}
          </p>
          <p className='mt-2 text-2xl font-black tracking-tighter italic tabular-nums'>
            {isFetchingAssignment ? '...' : assignedCategoryCount}
          </p>
        </div>
        <div className='rounded-[24px] bg-muted/25 p-4'>
          <p className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.summary.directCommands')}
          </p>
          <p className='mt-2 text-2xl font-black tracking-tighter italic tabular-nums'>
            {isFetchingAssignment ? '...' : directCommandCount}
          </p>
        </div>
        <div className='rounded-[24px] bg-muted/25 p-4'>
          <p className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.summary.assignablePool')}
          </p>
          <p className='mt-2 text-2xl font-black tracking-tighter italic tabular-nums'>
            {assignableCount}
          </p>
        </div>
        <div className='rounded-[24px] bg-muted/25 p-4'>
          <p className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.summary.batchTargets')}
          </p>
          <p className='mt-2 text-2xl font-black tracking-tighter italic tabular-nums'>
            {selectedTargetCount}
          </p>
        </div>
      </div>
    </div>
  )
}

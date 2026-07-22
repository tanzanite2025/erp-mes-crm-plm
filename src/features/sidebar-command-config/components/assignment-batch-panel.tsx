import { CheckCircle2, Copy, UsersRound } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import type { BatchSidebarCommandMode } from '../api/shared'

type AssignmentBatchPanelProps = {
  batchMode: BatchSidebarCommandMode
  selectedTargetCount: number
  hasSelectedAccount: boolean
  isBatchPending: boolean
  isCopyPending: boolean
  onBatchModeChange: (mode: BatchSidebarCommandMode) => void
  onApplyBatch: () => void
  onCopyCurrent: () => void
}

export function AssignmentBatchPanel({
  batchMode,
  selectedTargetCount,
  hasSelectedAccount,
  isBatchPending,
  isCopyPending,
  onBatchModeChange,
  onApplyBatch,
  onCopyCurrent,
}: AssignmentBatchPanelProps) {
  const { t } = useLanguage()

  return (
    <div className='rounded-[18px] border border-dashed border-muted/50 bg-background px-4 py-3 shadow-inner'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex items-center gap-3'>
          <div className='flex size-8 items-center justify-center rounded-xl bg-muted'>
            <UsersRound className='size-4' />
          </div>
          <div>
            <h2 className='text-sm font-black tracking-tighter italic'>
              {t('sidebarCommandAssignment.batch.title')}
            </h2>
            <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
              {t('sidebarCommandAssignment.batch.description')}
            </p>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            variant={batchMode === 'replace' ? 'default' : 'outline'}
            className='h-8 rounded-full px-4 text-[10px] font-black tracking-widest'
            onClick={() => onBatchModeChange('replace')}
          >
            {t('sidebarCommandAssignment.batch.replace')}
          </Button>
          <Button
            variant={batchMode === 'append' ? 'default' : 'outline'}
            className='h-8 rounded-full px-4 text-[10px] font-black tracking-widest'
            onClick={() => onBatchModeChange('append')}
          >
            {t('sidebarCommandAssignment.batch.append')}
          </Button>
          <Button
            className='h-8 gap-2 rounded-full px-4 text-[10px] font-black tracking-widest'
            disabled={
              selectedTargetCount === 0 || !hasSelectedAccount || isBatchPending
            }
            onClick={onApplyBatch}
          >
            <CheckCircle2 className='size-4' />
            {t('sidebarCommandAssignment.batch.apply')}
          </Button>
          <Button
            variant='outline'
            className='h-8 gap-2 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest'
            disabled={
              selectedTargetCount === 0 || isCopyPending || !hasSelectedAccount
            }
            onClick={onCopyCurrent}
          >
            <Copy className='size-4' />
            {t('sidebarCommandAssignment.batch.copy')}
          </Button>
        </div>
      </div>
    </div>
  )
}

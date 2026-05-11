import { Button } from '@/components/ui/button'

interface PurchaseOrderFinanceStatusBannerProps {
  isFinanceLoading: boolean
  isFinanceError: boolean
  financeErrorMessage: string
  onRetry: () => void
}

export function PurchaseOrderFinanceStatusBanner({
  isFinanceLoading,
  isFinanceError,
  financeErrorMessage,
  onRetry,
}: PurchaseOrderFinanceStatusBannerProps) {
  return (
    <>
      {isFinanceLoading ? (
        <div className='flex items-center justify-between gap-3 rounded-[24px] border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3'>
          <div className='space-y-1'>
            <p className='text-[10px] font-black uppercase tracking-widest text-amber-700'>财务基础数据加载中</p>
            <p className='text-[9px] font-bold text-amber-700/80'>币种、付款方式与账期暂不可编辑。</p>
          </div>
        </div>
      ) : null}
      {isFinanceError ? (
        <div className='flex items-center justify-between gap-3 rounded-[24px] border border-dashed border-rose-500/30 bg-rose-500/5 px-4 py-3'>
          <div className='space-y-1'>
            <p className='text-[10px] font-black uppercase tracking-widest text-rose-700'>财务基础数据加载失败</p>
            <p className='text-[9px] font-bold text-rose-700/80'>{financeErrorMessage || '请重试后再编辑币种、付款方式与账期。'}</p>
          </div>
          <Button
            type='button'
            variant='outline'
            className='h-9 rounded-full border-dashed px-4 text-[10px] font-black uppercase tracking-widest'
            onClick={onRetry}
          >
            重试
          </Button>
        </div>
      ) : null}
    </>
  )
}

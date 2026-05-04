import {
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

type QuoteWorkspaceHeaderProps = {
  detail: QuoteDetail | null
  isCreateMode: boolean
  isLoading: boolean
  detailError: string | null
}

export function QuoteWorkspaceHeader({
  detail,
  isCreateMode,
  isLoading,
  detailError,
}: QuoteWorkspaceHeaderProps) {
  return (
    <DialogHeader className='border-b border-dashed border-border/60 px-4 py-3 pr-12'>
      <div className='flex flex-col gap-2'>
        <div>
          <DialogTitle className='text-lg font-black tracking-tight'>报价工作台</DialogTitle>
        </div>
        {!isLoading && !detail && !detailError && !isCreateMode ? (
          <div className='rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground'>
            未加载到报价详情，请返回列表后重新打开该报价。
          </div>
        ) : null}
      </div>
    </DialogHeader>
  )
}

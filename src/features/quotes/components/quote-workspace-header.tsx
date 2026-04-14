import { Badge } from '@/components/ui/badge'
import {
  DialogDescription,
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
    <DialogHeader className='border-b border-dashed border-border/60 px-4 py-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='space-y-1'>
          <DialogTitle className='text-lg font-black tracking-tight'>报价工作台</DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? '在同一个工作台中完成报价新建，并在创建成功后继续转发、导出与转单。'
              : '在一个弹窗里完成报价查看、局部编辑、导出 PDF、客户转发与转正式销售订单等现场高频动作。'}
          </DialogDescription>
        </div>
        {detail && !isCreateMode ? (
          <div className='flex flex-wrap gap-2'>
            <Badge variant='outline'>{detail.quoteNo}</Badge>
            <Badge variant='secondary'>{detail.status}</Badge>
            <Badge variant='outline'>{detail.type}</Badge>
          </div>
        ) : null}

        {!isLoading && !detail && !detailError && !isCreateMode ? (
          <div className='rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground'>
            未加载到报价详情，请返回列表后重新打开该报价。
          </div>
        ) : null}
      </div>
    </DialogHeader>
  )
}

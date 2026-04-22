import { Copy } from 'lucide-react'

export function BusinessEventSourceListHint() {
  return (
    <div className='flex items-center gap-2 rounded-2xl border border-dashed border-muted/40 bg-muted/10 px-4 py-3 text-xs font-bold text-muted-foreground'>
      <Copy className='size-4' />
      复制会保留状态、字段、动态接收人和默认跳转，并自动生成不冲突的事件源编码。
    </div>
  )
}

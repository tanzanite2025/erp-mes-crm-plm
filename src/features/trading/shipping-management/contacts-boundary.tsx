import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function ShippingContactsLoadingState() {
  return (
    <Card className='rounded-[28px] border-dashed border-border/60 bg-background/80 px-6 py-8 shadow-none'>
      <div className='text-sm font-black'>车型规格库加载中...</div>
    </Card>
  )
}

export function ShippingContactsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className='rounded-[28px] border-dashed border-destructive/40 bg-destructive/5 px-6 py-6 shadow-none'>
      <div className='flex items-start gap-3'>
        <AlertCircle className='mt-0.5 size-5 text-destructive' />
        <div className='min-w-0 flex-1'>
          <div className='text-sm font-black text-destructive'>车型规格库读取失败</div>
          <div className='mt-2 text-sm leading-relaxed text-muted-foreground'>{message}</div>
          <button type='button' onClick={onRetry} className='mt-4 rounded-full border border-dashed border-destructive/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-destructive'>
            重新加载
          </button>
        </div>
      </div>
    </Card>
  )
}

export function ShippingContactsEmptyState() {
  return (
    <Card className='rounded-[28px] border-dashed border-border/60 bg-background/80 px-6 py-8 shadow-none'>
      <div className='text-sm font-black'>暂无可绑定车型</div>
      <div className='mt-2 text-sm leading-relaxed text-muted-foreground'>
        当前车型规格库没有返回可用车型，联系人卡片暂时无法建立绑定关系。
      </div>
    </Card>
  )
}

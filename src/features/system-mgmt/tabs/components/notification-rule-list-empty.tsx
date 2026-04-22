import { Bell } from 'lucide-react'

interface NotificationRuleListEmptyProps {
  filtered?: boolean
}

export function NotificationRuleListEmpty({
  filtered = false,
}: NotificationRuleListEmptyProps) {
  if (filtered) {
    return (
      <div className='rounded-[28px] border-2 border-dashed border-muted/30 bg-muted/5 px-6 py-12 text-center'>
        <p className='text-sm font-black text-foreground'>没有找到匹配的规则</p>
        <p className='mt-1 text-[11px] font-bold text-muted-foreground'>
          试试换一个规则名关键词，或者把业务源筛选切回“全部业务源”。
        </p>
      </div>
    )
  }

  return (
    <div className='group flex h-64 flex-col items-center justify-center gap-4 rounded-[40px] border-4 border-dashed border-muted/20 bg-muted/5 transition-colors hover:border-primary/20'>
      <div className='flex size-16 items-center justify-center rounded-3xl bg-muted/20 transition-transform group-hover:scale-110'>
        <Bell className='size-8 opacity-20' />
      </div>
      <div className='text-center'>
        <p className='text-[12px] font-black tracking-widest text-muted-foreground uppercase'>
          当前的监控雷达为空
        </p>
        <p className='mt-1 text-[10px] text-muted-foreground/60 italic'>
          点击上方按钮，开始建立业务通知链路
        </p>
      </div>
    </div>
  )
}

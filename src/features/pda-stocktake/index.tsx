'use client'

import { useState } from 'react'
import {
  Landmark,
  ClipboardCheck,
  ArrowRight,
  User,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { StocktakeScanner } from './components/stocktake-scanner'
import { useGetStocktakeTasks } from './hooks/use-stocktake'

export default function PDAStocktake() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const { data: tasks = [], isLoading } = useGetStocktakeTasks()

  if (selectedTaskId) {
    return (
      <StocktakeScanner
        taskId={selectedTaskId}
        onBack={() => setSelectedTaskId(null)}
      />
    )
  }

  return (
    <div className='flex min-h-screen animate-in flex-col gap-6 bg-background p-4 duration-700 fade-in md:gap-8 md:p-8'>
      {/* PDA 工业感页眉 */}
      <div className='relative flex flex-col gap-2 overflow-hidden rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/5 p-6'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent' />
        <div className='flex items-center gap-2 text-blue-600'>
          <Landmark className='size-5' />
          <h3 className='text-lg font-black tracking-tighter uppercase italic underline decoration-dashed decoration-1 underline-offset-4'>
            PDA_STOCKTAKE_HUB
          </h3>
        </div>
        <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
          盘点核心中心 / 选择待处理任务以进入 SDRTS 扫码模式
        </p>
      </div>

      {/* 任务列表 */}
      <div className='grid gap-4'>
        {isLoading ? (
          <div className='flex flex-col items-center justify-center p-20 opacity-20'>
            <RefreshCw className='mb-4 size-8 animate-spin' />
            <p className='text-[10px] font-black tracking-widest uppercase'>
              Loading_Tasks
            </p>
          </div>
        ) : tasks.length === 0 ? (
          <div className='rounded-[32px] border border-dashed border-muted-foreground/20 bg-muted/5 p-20 text-center italic opacity-30'>
            <ClipboardCheck className='mx-auto mb-4 size-12 opacity-5' />
            <p className='text-xs font-black tracking-widest uppercase'>
              No_Active_Stocktake_Task
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <Card
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className='group relative cursor-pointer overflow-hidden rounded-[28px] border-none bg-muted/10 transition-all hover:bg-muted/20 active:scale-[0.98]'
            >
              <CardContent className='flex items-center justify-between p-6'>
                <div className='flex items-center gap-4'>
                  <div className='flex size-12 items-center justify-center rounded-2xl bg-background shadow-sm'>
                    <ClipboardCheck className='size-6 text-blue-500' />
                  </div>
                  <div className='flex flex-col'>
                    <h4 className='text-sm leading-tight font-black tracking-tight uppercase'>
                      {task.title}
                    </h4>
                    <div className='mt-1.5 flex items-center gap-3'>
                      <Badge
                        variant='outline'
                        className={cn(
                          'h-4 rounded-full border-none px-2 text-[8px] font-black',
                          task.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        )}
                      >
                        {task.status}
                      </Badge>
                      <div className='flex items-center gap-1.5 text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                        <User className='size-2.5' /> {task.createdBy}
                        <Calendar className='ml-1 size-2.5' />{' '}
                        {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <ArrowRight className='size-5 text-muted-foreground/20 transition-colors group-hover:text-blue-500' />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 底部备注 */}
      <div className='mt-auto flex items-center gap-2 p-4 opacity-30'>
        <div className='size-1 rounded-full bg-blue-500' />
        <p className='text-[8px] font-black tracking-widest uppercase'>
          Protocol_Ready: SDRTS_V1_TX_QUEUE
        </p>
      </div>
    </div>
  )
}

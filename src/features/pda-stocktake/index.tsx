'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useGetStocktakeTasks } from './hooks/use-stocktake'
import { StocktakeScanner } from './components/stocktake-scanner'
import { Landmark, ClipboardCheck, ArrowRight, User, Calendar, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function PDAStocktake() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const { data: tasks = [], isLoading } = useGetStocktakeTasks()

  if (selectedTaskId) {
    return <StocktakeScanner taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />
  }

  return (
    <div className='flex flex-col gap-6 md:gap-8 p-4 md:p-8 animate-in fade-in duration-700 bg-background min-h-screen'>
      {/* PDA 工业感页眉 */}
      <div className='flex flex-col gap-2 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted-foreground/10 relative overflow-hidden'>
        <div className='absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent pointer-events-none' />
        <div className='flex items-center gap-2 text-blue-600'>
          <Landmark className='size-5' />
          <h3 className='text-lg font-black tracking-tighter italic uppercase underline decoration-dashed decoration-1 underline-offset-4'>
            PDA_STOCKTAKE_HUB
          </h3>
        </div>
        <p className='text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          盘点核心中心 / 选择待处理任务以进入 SDRTS 扫码模式
        </p>
      </div>

      {/* 任务列表 */}
      <div className='grid gap-4'>
        {isLoading ? (
          <div className='flex flex-col items-center justify-center p-20 opacity-20'>
            <RefreshCw className='animate-spin size-8 mb-4' />
            <p className='text-[10px] font-black uppercase tracking-widest'>Loading_Tasks</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className='p-20 text-center bg-muted/5 rounded-[32px] border border-dashed border-muted-foreground/20 italic opacity-30'>
             <ClipboardCheck className='size-12 mx-auto mb-4 opacity-5' />
             <p className='text-xs font-black uppercase tracking-widest'>No_Active_Stocktake_Task</p>
          </div>
        ) : (
          tasks.map(task => (
            <Card 
              key={task.id} 
              onClick={() => setSelectedTaskId(task.id)}
              className='rounded-[28px] border-none bg-muted/10 hover:bg-muted/20 active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden'
            >
              <CardContent className='p-6 flex items-center justify-between'>
                <div className='flex items-center gap-4'>
                  <div className='size-12 rounded-2xl bg-background flex items-center justify-center shadow-sm'>
                    <ClipboardCheck className='size-6 text-blue-500' />
                  </div>
                  <div className='flex flex-col'>
                    <h4 className='text-sm font-black tracking-tight leading-tight uppercase'>{task.title}</h4>
                    <div className='flex items-center gap-3 mt-1.5'>
                      <Badge variant='outline' className={cn(
                        'h-4 text-[8px] font-black px-2 rounded-full border-none',
                        task.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                      )}>
                        {task.status}
                      </Badge>
                      <div className='flex items-center gap-1.5 text-[9px] text-muted-foreground/50 font-black uppercase tracking-widest'>
                        <User className='size-2.5' /> {task.createdBy}
                        <Calendar className='size-2.5 ml-1' /> {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <ArrowRight className='size-5 text-muted-foreground/20 group-hover:text-blue-500 transition-colors' />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 底部备注 */}
      <div className='mt-auto p-4 flex items-center gap-2 opacity-30'>
         <div className='size-1 rounded-full bg-blue-500' />
         <p className='text-[8px] font-black uppercase tracking-widest'>Protocol_Ready: SDRTS_V1_TX_QUEUE</p>
      </div>
    </div>
  )
}

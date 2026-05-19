'use client'

import { useState } from 'react'
import { Calendar, Wrench, ShieldCheck, AlertTriangle, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useMaintenanceRecordsGlobal } from '../hooks/use-maintenance-records-global'

export function MaintenancePlansPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())

  // 拉取真实的维保记录（限制拉取较多数据以供日程统计）
  const { records: allRecords, isLoading } = useMaintenanceRecordsGlobal({
    pagination: { limit: 200 },
  })

  // 筛选出 PREVENTIVE (预防性保养) 类型的真实记录作为保养计划
  const planTasks = allRecords.filter((r) => r.type === 'PREVENTIVE')

  const getCycleBadge = (priority: string) => {
    // 后端记录中可能主要区分优先级，我们根据优先级动态呈现保养级别
    switch (priority) {
      case 'CRITICAL':
      case 'HIGH':
        return <Badge variant='outline' className='text-[8px] font-black tracking-widest text-rose-500 border-rose-500/20 bg-rose-500/5'>一级保养</Badge>
      case 'MEDIUM':
        return <Badge variant='outline' className='text-[8px] font-black tracking-widest text-amber-500 border-amber-500/20 bg-amber-50/5'>二级保养</Badge>
      default:
        return <Badge variant='outline' className='text-[8px] font-black tracking-widest text-blue-500 border-blue-500/20 bg-blue-500/5'>常规检查</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className='bg-blue-500/10 text-blue-600 border-blue-200 text-[8px] font-black'>待处理</Badge>
      case 'IN_PROGRESS':
        return <Badge className='bg-amber-500/10 text-amber-600 border-amber-200 text-[8px] font-black'>进行中</Badge>
      case 'COMPLETED':
        return <Badge className='bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[8px] font-black'>已完成</Badge>
      case 'CANCELLED':
        return <Badge className='bg-slate-500/10 text-slate-500 border-slate-200 text-[8px] font-black'>已取消</Badge>
      default:
        return <Badge className='text-[8px] font-black'>{status}</Badge>
    }
  }

  // 生成当前周的日期
  const getWeekDays = () => {
    const startOfWeek = new Date(currentWeek)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    const days = []
    for (let i = 0; i < 7; i++) {
      const current = new Date(startOfWeek)
      current.setDate(startOfWeek.getDate() + i)
      days.push(current)
    }
    return days
  }

  const weekDays = getWeekDays()
  const weekLabel = `${weekDays[0].toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} ~ ${weekDays[6].toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}`

  const handlePrevWeek = () => {
    const prev = new Date(currentWeek)
    prev.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(prev)
  }

  const handleNextWeek = () => {
    const next = new Date(currentWeek)
    next.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(next)
  }

  // 匹配特定日期的维保记录 (根据记录的 createdAt 匹配)
  const getTasksForDay = (date: Date) => {
    const targetStr = date.toISOString().split('T')[0]
    return planTasks.filter((t) => {
      const recordDateStr = new Date(t.createdAt).toISOString().split('T')[0]
      return recordDateStr === targetStr
    })
  }

  // 基于真实数据计算 KPI
  const totalPlansCount = planTasks.length
  const overdueCount = planTasks.filter((r) => r.status === 'OPEN' && new Date(r.createdAt) < new Date()).length
  const completedCount = planTasks.filter((r) => r.status === 'COMPLETED').length
  const coveredAssetsCount = Array.from(new Set(planTasks.map((r) => r.assetSn))).length

  return (
    <div className='flex flex-col gap-4 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Calendar}
        title="保养与计划调度"
        description="PREVENTIVE_MAINTENANCE_SCHEDULER / 系统根据运行时间与模次寿命自动生成预防性维护"
        gradient
      />

      {/* KPI Cards Container - Ultra Compact */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {[
          { label: '预防性保养总数', count: totalPlansCount, icon: Calendar, color: 'text-blue-500' },
          { label: '超期未保养数', count: overdueCount, icon: AlertTriangle, color: 'text-rose-500' },
          { label: '已完成预防性维保', count: completedCount, icon: ShieldCheck, color: 'text-emerald-500' },
          { label: '已覆盖设备数', count: coveredAssetsCount, icon: Wrench, color: 'text-cyan-500' },
        ].map((card, i) => (
          <Card key={i} className='border-dashed rounded-[20px] bg-muted/5 p-3 flex items-center justify-between relative overflow-hidden group'>
            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
            <div className='space-y-0.5'>
              <p className='text-[9px] font-black uppercase tracking-wider text-muted-foreground/50'>{card.label}</p>
              <p className='text-xl font-black tracking-tighter italic'>{isLoading ? '...' : card.count}</p>
            </div>
            <card.icon className={`size-5 ${card.color} opacity-80`} />
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-3.5'>
        {/* Left Side: Weekly Calendar */}
        <Card className='border-dashed rounded-[24px] bg-muted/5 lg:col-span-8 flex flex-col p-4'>
          <CardHeader className='p-0 pb-3 flex flex-row items-center justify-between'>
            <CardTitle className='text-sm font-black uppercase tracking-tight italic flex items-center gap-1.5'>
              <Calendar className='size-4 text-primary' />
              保养排班日程周历
            </CardTitle>
            <div className='flex items-center gap-2'>
              <span className='text-[10px] font-mono font-black text-muted-foreground'>{weekLabel}</span>
              <div className='flex gap-1'>
                <Button variant='outline' size='icon' className='h-6 w-6 rounded-lg' onClick={handlePrevWeek}>
                  <ChevronLeft className='size-3' />
                </Button>
                <Button variant='outline' size='icon' className='h-6 w-6 rounded-lg' onClick={handleNextWeek}>
                  <ChevronRight className='size-3' />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className='p-0 flex-1 grid grid-cols-1 md:grid-cols-7 gap-2 border border-dashed border-muted/50 rounded-2xl p-2 bg-background/50'>
            {weekDays.map((day, i) => {
              const tasks = getTasksForDay(day)
              const isToday = new Date().toDateString() === day.toDateString()
              return (
                <div
                  key={i}
                  className={`flex flex-col min-h-[140px] md:min-h-0 md:h-[220px] rounded-xl border border-dashed p-2 transition-colors ${
                    isToday
                      ? 'border-primary/50 bg-primary/5 shadow-inner'
                      : 'border-muted/30 hover:bg-muted/10'
                  }`}
                >
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-[9px] font-black uppercase text-muted-foreground'>
                      {['周一', '周二', '周三', '周四', '周五', '周六', '周日'][day.getDay() === 0 ? 6 : day.getDay() - 1]}
                    </span>
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground/60'
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>

                  <div className='flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin'>
                    {isLoading ? (
                      <span className='text-[8px] text-muted-foreground/30 block mt-4 text-center'>拉取中...</span>
                    ) : tasks.length === 0 ? (
                      <span className='text-[8px] font-bold text-muted-foreground/20 italic block mt-4 text-center'>无任务</span>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          className='p-1.5 rounded-lg border border-dashed bg-background/80 hover:bg-background transition-shadow shadow-xs text-[9px] flex flex-col gap-1 cursor-pointer'
                        >
                          <div className='flex items-center justify-between'>
                            <span className='font-mono font-black text-muted-foreground/70 text-[8px] truncate max-w-[50px]'>{task.assetSn}</span>
                            {getCycleBadge(task.priority)}
                          </div>
                          <p className='font-bold text-foreground/80 leading-tight line-clamp-2'>{task.title}</p>
                          <div className='flex justify-between items-center mt-1 border-t border-dashed border-muted/20 pt-1'>
                            <span className='text-[8px] text-muted-foreground/60'>{task.assetType === 'MOLD' ? '模具' : '炉台'}</span>
                            {getStatusBadge(task.status)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Right Side: Preventive Task List */}
        <Card className='border-dashed rounded-[24px] bg-muted/5 lg:col-span-4 p-4 flex flex-col justify-between'>
          <div>
            <CardHeader className='p-0 pb-3 flex flex-row items-center justify-between'>
              <CardTitle className='text-sm font-black uppercase tracking-tight italic flex items-center gap-1.5'>
                <Wrench className='size-4 text-primary' />
                保养计划任务看板
              </CardTitle>
              <Button size='sm' className='h-6 rounded-full text-[9px] font-black uppercase tracking-wider px-2'>
                <Plus className='size-3 mr-0.5' /> 新建计划
              </Button>
            </CardHeader>
            <CardContent className='p-0 space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin'>
              {isLoading ? (
                <div className='text-center py-8 text-muted-foreground text-xs font-bold'>载入任务库...</div>
              ) : planTasks.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground text-xs italic font-bold'>暂无预防性保养任务</div>
              ) : (
                planTasks.map((task) => (
                  <div
                    key={task.id}
                    className='p-2.5 rounded-xl border border-dashed border-muted/40 bg-background/50 hover:bg-background/90 transition-colors flex flex-col gap-1.5 relative overflow-hidden group'
                  >
                    <div className='absolute inset-y-0 left-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors' />
                    <div className='flex items-center justify-between pl-1'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-[8px] font-mono font-black text-muted-foreground/60 bg-muted/30 px-1 rounded-sm'>{task.assetSn}</span>
                        <span className='text-[9px] font-bold text-muted-foreground'>{task.assetType === 'MOLD' ? '模具' : '炉台'}</span>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                    <p className='text-xs font-bold pl-1 leading-tight text-foreground/80'>{task.title}</p>
                    <div className='flex items-center justify-between pl-1 pt-1.5 border-t border-dashed border-muted/20 text-[9px] font-black text-muted-foreground/60'>
                      <div className='flex items-center gap-1'>
                        <span>级别：</span>
                        {getCycleBadge(task.priority)}
                      </div>
                      <span>创建：{new Date(task.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>
          <div className='border-t border-dashed border-muted/30 pt-3 mt-3 flex justify-between items-center text-[9px] font-black text-muted-foreground/50'>
            <span>共 {planTasks.length} 项常规保养</span>
            <span className='text-primary hover:underline cursor-pointer'>配置维护保养规则 &rarr;</span>
          </div>
        </Card>
      </div>
    </div>
  )
}

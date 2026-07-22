'use client'

import { useState } from 'react'
import {
  Calendar,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
        return (
          <Badge
            variant='outline'
            className='border-rose-500/20 bg-rose-500/5 text-[8px] font-black tracking-widest text-rose-500'
          >
            一级保养
          </Badge>
        )
      case 'MEDIUM':
        return (
          <Badge
            variant='outline'
            className='border-amber-500/20 bg-amber-50/5 text-[8px] font-black tracking-widest text-amber-500'
          >
            二级保养
          </Badge>
        )
      default:
        return (
          <Badge
            variant='outline'
            className='border-blue-500/20 bg-blue-500/5 text-[8px] font-black tracking-widest text-blue-500'
          >
            常规检查
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <Badge className='border-blue-200 bg-blue-500/10 text-[8px] font-black text-blue-600'>
            待处理
          </Badge>
        )
      case 'IN_PROGRESS':
        return (
          <Badge className='border-amber-200 bg-amber-500/10 text-[8px] font-black text-amber-600'>
            进行中
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge className='border-emerald-200 bg-emerald-500/10 text-[8px] font-black text-emerald-600'>
            已完成
          </Badge>
        )
      case 'CANCELLED':
        return (
          <Badge className='border-slate-200 bg-slate-500/10 text-[8px] font-black text-slate-500'>
            已取消
          </Badge>
        )
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
  const overdueCount = planTasks.filter(
    (r) => r.status === 'OPEN' && new Date(r.createdAt) < new Date()
  ).length
  const completedCount = planTasks.filter(
    (r) => r.status === 'COMPLETED'
  ).length
  const coveredAssetsCount = Array.from(
    new Set(planTasks.map((r) => r.assetSn))
  ).length

  return (
    <div className='flex animate-in flex-col gap-4 duration-700 fade-in'>
      <IndustrialHeader
        icon={Calendar}
        title='保养与计划调度'
        description='PREVENTIVE_MAINTENANCE_SCHEDULER / 系统根据运行时间与模次寿命自动生成预防性维护'
        gradient
      />

      {/* KPI Cards Container - Ultra Compact */}
      <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
        {[
          {
            label: '预防性保养总数',
            count: totalPlansCount,
            icon: Calendar,
            color: 'text-blue-500',
          },
          {
            label: '超期未保养数',
            count: overdueCount,
            icon: AlertTriangle,
            color: 'text-rose-500',
          },
          {
            label: '已完成预防性维保',
            count: completedCount,
            icon: ShieldCheck,
            color: 'text-emerald-500',
          },
          {
            label: '已覆盖设备数',
            count: coveredAssetsCount,
            icon: Wrench,
            color: 'text-cyan-500',
          },
        ].map((card, i) => (
          <Card
            key={i}
            className='group relative flex items-center justify-between overflow-hidden rounded-[20px] border-dashed bg-muted/5 p-3'
          >
            <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
            <div className='space-y-0.5'>
              <p className='text-[9px] font-black tracking-wider text-muted-foreground/50 uppercase'>
                {card.label}
              </p>
              <p className='text-xl font-black tracking-tighter italic'>
                {isLoading ? '...' : card.count}
              </p>
            </div>
            <card.icon className={`size-5 ${card.color} opacity-80`} />
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className='grid grid-cols-1 gap-3.5 lg:grid-cols-12'>
        {/* Left Side: Weekly Calendar */}
        <Card className='flex flex-col rounded-[24px] border-dashed bg-muted/5 p-4 lg:col-span-8'>
          <CardHeader className='flex flex-row items-center justify-between p-0 pb-3'>
            <CardTitle className='flex items-center gap-1.5 text-sm font-black tracking-tight uppercase italic'>
              <Calendar className='size-4 text-primary' />
              保养排班日程周历
            </CardTitle>
            <div className='flex items-center gap-2'>
              <span className='font-mono text-[10px] font-black text-muted-foreground'>
                {weekLabel}
              </span>
              <div className='flex gap-1'>
                <Button
                  variant='outline'
                  size='icon'
                  className='h-6 w-6 rounded-lg'
                  onClick={handlePrevWeek}
                >
                  <ChevronLeft className='size-3' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='h-6 w-6 rounded-lg'
                  onClick={handleNextWeek}
                >
                  <ChevronRight className='size-3' />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className='grid flex-1 grid-cols-1 gap-2 rounded-2xl border border-dashed border-muted/50 bg-background/50 p-0 p-2 md:grid-cols-7'>
            {weekDays.map((day, i) => {
              const tasks = getTasksForDay(day)
              const isToday = new Date().toDateString() === day.toDateString()
              return (
                <div
                  key={i}
                  className={`flex min-h-[140px] flex-col rounded-xl border border-dashed p-2 transition-colors md:h-[220px] md:min-h-0 ${
                    isToday
                      ? 'border-primary/50 bg-primary/5 shadow-inner'
                      : 'border-muted/30 hover:bg-muted/10'
                  }`}
                >
                  <div className='mb-2 flex items-center justify-between'>
                    <span className='text-[9px] font-black text-muted-foreground uppercase'>
                      {
                        [
                          '周一',
                          '周二',
                          '周三',
                          '周四',
                          '周五',
                          '周六',
                          '周日',
                        ][day.getDay() === 0 ? 6 : day.getDay() - 1]
                      }
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black ${
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground/60'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  <div className='scrollbar-thin flex-1 space-y-1.5 overflow-y-auto pr-0.5'>
                    {isLoading ? (
                      <span className='mt-4 block text-center text-[8px] text-muted-foreground/30'>
                        拉取中...
                      </span>
                    ) : tasks.length === 0 ? (
                      <span className='mt-4 block text-center text-[8px] font-bold text-muted-foreground/20 italic'>
                        无任务
                      </span>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          className='flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed bg-background/80 p-1.5 text-[9px] shadow-xs transition-shadow hover:bg-background'
                        >
                          <div className='flex items-center justify-between'>
                            <span className='max-w-[50px] truncate font-mono text-[8px] font-black text-muted-foreground/70'>
                              {task.assetSn}
                            </span>
                            {getCycleBadge(task.priority)}
                          </div>
                          <p className='line-clamp-2 leading-tight font-bold text-foreground/80'>
                            {task.title}
                          </p>
                          <div className='mt-1 flex items-center justify-between border-t border-dashed border-muted/20 pt-1'>
                            <span className='text-[8px] text-muted-foreground/60'>
                              {task.assetType === 'MOLD' ? '模具' : '炉台'}
                            </span>
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
        <Card className='flex flex-col justify-between rounded-[24px] border-dashed bg-muted/5 p-4 lg:col-span-4'>
          <div>
            <CardHeader className='flex flex-row items-center justify-between p-0 pb-3'>
              <CardTitle className='flex items-center gap-1.5 text-sm font-black tracking-tight uppercase italic'>
                <Wrench className='size-4 text-primary' />
                保养计划任务看板
              </CardTitle>
              <Button
                size='sm'
                className='h-6 rounded-full px-2 text-[9px] font-black tracking-wider uppercase'
              >
                <Plus className='mr-0.5 size-3' /> 新建计划
              </Button>
            </CardHeader>
            <CardContent className='scrollbar-thin max-h-[360px] space-y-2 overflow-y-auto p-0 pr-1'>
              {isLoading ? (
                <div className='py-8 text-center text-xs font-bold text-muted-foreground'>
                  载入任务库...
                </div>
              ) : planTasks.length === 0 ? (
                <div className='py-8 text-center text-xs font-bold text-muted-foreground italic'>
                  暂无预防性保养任务
                </div>
              ) : (
                planTasks.map((task) => (
                  <div
                    key={task.id}
                    className='group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-dashed border-muted/40 bg-background/50 p-2.5 transition-colors hover:bg-background/90'
                  >
                    <div className='absolute inset-y-0 left-0 w-1 bg-primary/20 transition-colors group-hover:bg-primary' />
                    <div className='flex items-center justify-between pl-1'>
                      <div className='flex items-center gap-1.5'>
                        <span className='rounded-sm bg-muted/30 px-1 font-mono text-[8px] font-black text-muted-foreground/60'>
                          {task.assetSn}
                        </span>
                        <span className='text-[9px] font-bold text-muted-foreground'>
                          {task.assetType === 'MOLD' ? '模具' : '炉台'}
                        </span>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                    <p className='pl-1 text-xs leading-tight font-bold text-foreground/80'>
                      {task.title}
                    </p>
                    <div className='flex items-center justify-between border-t border-dashed border-muted/20 pt-1.5 pl-1 text-[9px] font-black text-muted-foreground/60'>
                      <div className='flex items-center gap-1'>
                        <span>级别：</span>
                        {getCycleBadge(task.priority)}
                      </div>
                      <span>
                        创建：
                        {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>
          <div className='mt-3 flex items-center justify-between border-t border-dashed border-muted/30 pt-3 text-[9px] font-black text-muted-foreground/50'>
            <span>共 {planTasks.length} 项常规保养</span>
            <span className='cursor-pointer text-primary hover:underline'>
              配置维护保养规则 &rarr;
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}

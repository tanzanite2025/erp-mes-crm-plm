'use client'

import { useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Wrench,
  ShieldCheck,
  Heart,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useMaintenanceRecordsGlobal } from '../hooks/use-maintenance-records-global'

export function MaintenanceOverview() {
  const navigate = useNavigate()

  // Fetch stats
  const { stats, isLoadingStats } = useMaintenanceRecordsGlobal()

  // Fetch high-priority open records
  const { records: highPriorityRecords, isLoading: isLoadingHighPriority } =
    useMaintenanceRecordsGlobal({
      filters: { status: 'OPEN', priority: 'HIGH,CRITICAL' },
      pagination: { limit: 5 },
    })

  // Fetch recent activities
  const { records: recentRecords, isLoading: isLoadingRecent } =
    useMaintenanceRecordsGlobal({
      pagination: { limit: 5 },
    })

  const statusCards = [
    {
      key: 'open',
      label: '待处理',
      icon: AlertCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      count: stats?.open || 0,
      link: '/equipment-maintenance/records?status=OPEN',
    },
    {
      key: 'inProgress',
      label: '进行中',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      count: stats?.inProgress || 0,
      link: '/equipment-maintenance/records?status=IN_PROGRESS',
    },
    {
      key: 'completed',
      label: '已完成',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      count: stats?.completed || 0,
      link: '/equipment-maintenance/records?status=COMPLETED',
    },
    {
      key: 'cancelled',
      label: '已取消',
      icon: XCircle,
      color: 'text-slate-500',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/20',
      count: stats?.cancelled || 0,
      link: '/equipment-maintenance/records?status=CANCELLED',
    },
  ]

  const totalStats =
    (stats?.open || 0) +
    (stats?.inProgress || 0) +
    (stats?.completed || 0) +
    (stats?.cancelled || 0)
  const completedPercent =
    totalStats > 0
      ? Math.round(((stats?.completed || 0) / totalStats) * 100)
      : 100

  const healthData = [
    { name: '健康运行', value: completedPercent, color: '#10b981' },
    { name: '维护与故障', value: 100 - completedPercent, color: '#f59e0b' },
  ]

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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return (
          <Badge className='animate-pulse bg-rose-600 text-[8px] font-black text-white'>
            紧急
          </Badge>
        )
      case 'HIGH':
        return (
          <Badge className='bg-orange-500 text-[8px] font-black text-white'>
            高
          </Badge>
        )
      case 'MEDIUM':
        return (
          <Badge className='bg-blue-500 text-[8px] font-black text-white'>
            中
          </Badge>
        )
      case 'LOW':
        return (
          <Badge className='bg-slate-400 text-[8px] font-black text-white'>
            低
          </Badge>
        )
      default:
        return <Badge className='text-[8px] font-black'>{priority}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className='flex animate-in flex-col gap-4 duration-700 fade-in'>
      <IndustrialHeader
        icon={Wrench}
        title='设备维保中心'
        description='EQUIPMENT_MAINTENANCE_CENTER / 系统自动监控设备运行状况与维保调度'
        gradient
      />

      {/* Top Section: stats cards + health dial (Grid 2-column) */}
      <div className='grid grid-cols-1 gap-3.5 lg:grid-cols-12'>
        {/* Left: Stats Cards 2x2 Grid (col-span-8) */}
        <div className='grid grid-cols-2 gap-3 lg:col-span-8'>
          {statusCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.key}
                className={cn(
                  'group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-[20px] border-dashed bg-muted/5 p-3 transition-all hover:bg-muted/10',
                  card.borderColor
                )}
                onClick={() => navigate({ to: card.link })}
              >
                <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
                <div className='min-w-0 space-y-1'>
                  <p className='text-[9px] leading-none font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {card.label}
                  </p>
                  <p className='text-2xl leading-none font-black tracking-tighter italic'>
                    {isLoadingStats ? '...' : card.count}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    card.bgColor
                  )}
                >
                  <Icon className={cn('size-4.5', card.color)} />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Right: Health Dial Chart (col-span-4) - Compact */}
        <Card className='relative flex items-center justify-between overflow-hidden rounded-[20px] border-dashed bg-muted/5 p-3 lg:col-span-4'>
          <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
          <div className='z-10 space-y-0.5'>
            <CardTitle className='flex items-center gap-1 text-[10px] font-black tracking-wider text-emerald-500 uppercase italic'>
              <Heart className='size-3' />
              设备总健康度
            </CardTitle>
            <p className='text-xl font-black tracking-tighter italic'>
              {isLoadingStats ? '...' : `${completedPercent}%`}
            </p>
            <p className='text-[8px] leading-none font-black tracking-widest text-muted-foreground/60 uppercase'>
              {isLoadingStats
                ? '评估中'
                : completedPercent >= 90
                  ? '健康评级: 优'
                  : completedPercent >= 75
                    ? '健康评级: 良'
                    : '健康评级: 预警'}
            </p>
          </div>
          <div className='relative flex h-[70px] w-[70px] shrink-0 items-center justify-center'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={healthData}
                  cx='50%'
                  cy='50%'
                  innerRadius={23}
                  outerRadius={30}
                  paddingAngle={2}
                  dataKey='value'
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className='absolute font-mono text-[8px] font-black text-emerald-500'>
              {isLoadingStats ? '...' : `${completedPercent}%`}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Section: Dual Column lists (Grid 2-column) */}
      <div className='grid grid-cols-1 gap-3.5 lg:grid-cols-12'>
        {/* Left Column: High Priority (col-span-6) */}
        <Card className='flex flex-col justify-between rounded-[24px] border-dashed bg-muted/5 p-4 lg:col-span-6'>
          <div>
            <CardHeader className='flex flex-row items-center justify-between p-0 pb-3'>
              <CardTitle className='flex items-center gap-1.5 text-sm font-black tracking-tight uppercase italic'>
                <AlertCircle className='size-4.5 text-rose-500' />
                高优先级待处理
              </CardTitle>
              <Button
                variant='ghost'
                size='sm'
                className='h-6 px-2 text-[9px] font-black tracking-wider uppercase'
                onClick={() =>
                  navigate({ to: '/equipment-maintenance/records' })
                }
              >
                查看全部 <ArrowRight className='ml-0.5 size-3' />
              </Button>
            </CardHeader>
            <CardContent className='space-y-1.5 p-0'>
              {isLoadingHighPriority ? (
                <div className='py-6 text-center text-xs font-bold text-muted-foreground'>
                  加载中...
                </div>
              ) : highPriorityRecords.length === 0 ? (
                <div className='py-6 text-center text-xs font-bold text-muted-foreground italic'>
                  暂无高优先级待处理记录
                </div>
              ) : (
                highPriorityRecords.map((record) => (
                  <div
                    key={record.id}
                    className='flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-muted/30 bg-background/50 p-2 text-xs transition-colors hover:bg-background/80'
                    onClick={() => {
                      const path =
                        record.assetType === 'MOLD'
                          ? '/equipment-tooling/molds'
                          : '/tooling-furnaces'
                      navigate({ to: path })
                    }}
                  >
                    <div className='flex min-w-0 flex-1 items-center gap-2 pl-1'>
                      <Wrench className='size-3.5 shrink-0 text-muted-foreground/30' />
                      <div className='min-w-0 flex-1'>
                        <div className='mb-0.5 flex items-center gap-1.5'>
                          {getPriorityBadge(record.priority)}
                          <span className='font-mono text-[8px] font-black text-muted-foreground/50'>
                            {record.assetSn}
                          </span>
                        </div>
                        <p className='truncate leading-none font-bold text-foreground/80'>
                          {record.title}
                        </p>
                      </div>
                    </div>
                    <div className='shrink-0 pr-1 text-[8px] font-black text-muted-foreground/40'>
                      {formatDate(record.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>
          <div className='mt-3 border-t border-dashed border-muted/20 pt-2.5 text-center font-mono text-[8px] text-muted-foreground/30'>
            ALERT INTENTS ACTIVE
          </div>
        </Card>

        {/* Right Column: Recent Activities (col-span-6) */}
        <Card className='flex flex-col justify-between rounded-[24px] border-dashed bg-muted/5 p-4 lg:col-span-6'>
          <div>
            <CardHeader className='flex flex-row items-center justify-between p-0 pb-3'>
              <CardTitle className='flex items-center gap-1.5 text-sm font-black tracking-tight uppercase italic'>
                <Clock className='size-4.5 text-blue-500' />
                最近维保动态
              </CardTitle>
              <Button
                variant='ghost'
                size='sm'
                className='h-6 px-2 text-[9px] font-black tracking-wider uppercase'
                onClick={() =>
                  navigate({ to: '/equipment-maintenance/records' })
                }
              >
                查看全部 <ArrowRight className='ml-0.5 size-3' />
              </Button>
            </CardHeader>
            <CardContent className='space-y-1.5 p-0'>
              {isLoadingRecent ? (
                <div className='py-6 text-center text-xs font-bold text-muted-foreground'>
                  加载中...
                </div>
              ) : recentRecords.length === 0 ? (
                <div className='py-6 text-center text-xs font-bold text-muted-foreground italic'>
                  暂无维保动态
                </div>
              ) : (
                recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className='flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-muted/30 bg-background/50 p-2 text-xs transition-colors hover:bg-background/80'
                    onClick={() => {
                      const path =
                        record.assetType === 'MOLD'
                          ? '/equipment-tooling/molds'
                          : '/tooling-furnaces'
                      navigate({ to: path })
                    }}
                  >
                    <div className='flex min-w-0 flex-1 items-center gap-2 pl-1'>
                      <ShieldCheck className='size-3.5 shrink-0 text-muted-foreground/30' />
                      <div className='min-w-0 flex-1'>
                        <div className='mb-0.5 flex items-center gap-1.5'>
                          {getStatusBadge(record.status)}
                          {getPriorityBadge(record.priority)}
                          <span className='font-mono text-[8px] font-black text-muted-foreground/50'>
                            {record.assetSn}
                          </span>
                        </div>
                        <p className='truncate leading-none font-bold text-foreground/80'>
                          {record.title}
                        </p>
                      </div>
                    </div>
                    <div className='shrink-0 pr-1 text-[8px] font-black text-muted-foreground/40'>
                      {formatDate(record.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>
          <div className='mt-3 border-t border-dashed border-muted/20 pt-2.5 text-center font-mono text-[8px] text-muted-foreground/30'>
            TELEMETRY BUS LINKED
          </div>
        </Card>
      </div>
    </div>
  )
}

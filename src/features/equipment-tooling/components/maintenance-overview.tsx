'use client'

import { AlertCircle, CheckCircle2, Clock, XCircle, ArrowRight, Wrench, ShieldCheck, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMaintenanceRecordsGlobal } from '../hooks/use-maintenance-records-global'
import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export function MaintenanceOverview() {
  const navigate = useNavigate()

  // Fetch stats
  const { stats, isLoadingStats } = useMaintenanceRecordsGlobal()

  // Fetch high-priority open records
  const { records: highPriorityRecords, isLoading: isLoadingHighPriority } = useMaintenanceRecordsGlobal({
    filters: { status: 'OPEN', priority: 'HIGH,CRITICAL' },
    pagination: { limit: 5 },
  })

  // Fetch recent activities
  const { records: recentRecords, isLoading: isLoadingRecent } = useMaintenanceRecordsGlobal({
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

  const totalStats = (stats?.open || 0) + (stats?.inProgress || 0) + (stats?.completed || 0) + (stats?.cancelled || 0)
  const completedPercent = totalStats > 0 ? Math.round(((stats?.completed || 0) / totalStats) * 100) : 100

  const healthData = [
    { name: '健康运行', value: completedPercent, color: '#10b981' },
    { name: '维护与故障', value: 100 - completedPercent, color: '#f59e0b' },
  ]

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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge className='bg-rose-600 text-white text-[8px] font-black animate-pulse'>紧急</Badge>
      case 'HIGH':
        return <Badge className='bg-orange-500 text-white text-[8px] font-black'>高</Badge>
      case 'MEDIUM':
        return <Badge className='bg-blue-500 text-white text-[8px] font-black'>中</Badge>
      case 'LOW':
        return <Badge className='bg-slate-400 text-white text-[8px] font-black'>低</Badge>
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
    <div className='flex flex-col gap-4 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Wrench}
        title="设备维保中心"
        description="EQUIPMENT_MAINTENANCE_CENTER / 系统自动监控设备运行状况与维保调度"
        gradient
      />

      {/* Top Section: stats cards + health dial (Grid 2-column) */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-3.5'>
        {/* Left: Stats Cards 2x2 Grid (col-span-8) */}
        <div className='lg:col-span-8 grid grid-cols-2 gap-3'>
          {statusCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.key}
                className={cn(
                  'group cursor-pointer transition-all hover:bg-muted/10 border-dashed rounded-[20px] bg-muted/5 p-3 flex items-center justify-between relative overflow-hidden',
                  card.borderColor
                )}
                onClick={() => navigate({ to: card.link })}
              >
                <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
                <div className='space-y-1 min-w-0'>
                  <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none'>
                    {card.label}
                  </p>
                  <p className='text-2xl font-black tracking-tighter italic leading-none'>
                    {isLoadingStats ? '...' : card.count}
                  </p>
                </div>
                <div className={cn('size-8 rounded-full flex items-center justify-center shrink-0', card.bgColor)}>
                  <Icon className={cn('size-4.5', card.color)} />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Right: Health Dial Chart (col-span-4) - Compact */}
        <Card className='border-dashed rounded-[20px] bg-muted/5 p-3 lg:col-span-4 flex items-center justify-between relative overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
          <div className='space-y-0.5 z-10'>
            <CardTitle className='text-[10px] font-black uppercase tracking-wider italic flex items-center gap-1 text-emerald-500'>
              <Heart className='size-3' />
              设备总健康度
            </CardTitle>
            <p className='text-xl font-black tracking-tighter italic'>
              {isLoadingStats ? '...' : `${completedPercent}%`}
            </p>
            <p className='text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest leading-none'>
              {isLoadingStats ? '评估中' : completedPercent >= 90 ? '健康评级: 优' : completedPercent >= 75 ? '健康评级: 良' : '健康评级: 预警'}
            </p>
          </div>
          <div className='w-[70px] h-[70px] shrink-0 relative flex items-center justify-center'>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={23}
                  outerRadius={30}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className='absolute text-[8px] font-black font-mono text-emerald-500'>
              {isLoadingStats ? '...' : `${completedPercent}%`}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Section: Dual Column lists (Grid 2-column) */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-3.5'>
        {/* Left Column: High Priority (col-span-6) */}
        <Card className='border-dashed rounded-[24px] bg-muted/5 p-4 lg:col-span-6 flex flex-col justify-between'>
          <div>
            <CardHeader className='p-0 pb-3 flex flex-row items-center justify-between'>
              <CardTitle className='text-sm font-black uppercase tracking-tight italic flex items-center gap-1.5'>
                <AlertCircle className='size-4.5 text-rose-500' />
                高优先级待处理
              </CardTitle>
              <Button
                variant='ghost'
                size='sm'
                className='h-6 text-[9px] font-black uppercase tracking-wider px-2'
                onClick={() => navigate({ to: '/equipment-maintenance/records' })}
              >
                查看全部 <ArrowRight className='size-3 ml-0.5' />
              </Button>
            </CardHeader>
            <CardContent className='p-0 space-y-1.5'>
              {isLoadingHighPriority ? (
                <div className='text-center py-6 text-muted-foreground text-xs font-bold'>加载中...</div>
              ) : highPriorityRecords.length === 0 ? (
                <div className='text-center py-6 text-muted-foreground text-xs italic font-bold'>暂无高优先级待处理记录</div>
              ) : (
                highPriorityRecords.map((record) => (
                  <div
                    key={record.id}
                    className='flex items-center justify-between p-2 rounded-xl border border-dashed border-muted/30 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer text-xs'
                    onClick={() => {
                      const path = record.assetType === 'MOLD' 
                        ? '/equipment-tooling/molds' 
                        : '/tooling-furnaces'
                      navigate({ to: path })
                    }}
                  >
                    <div className='flex items-center gap-2 min-w-0 flex-1 pl-1'>
                      <Wrench className='size-3.5 text-muted-foreground/30 shrink-0' />
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-1.5 mb-0.5'>
                          {getPriorityBadge(record.priority)}
                          <span className='text-[8px] font-mono font-black text-muted-foreground/50'>{record.assetSn}</span>
                        </div>
                        <p className='font-bold truncate text-foreground/80 leading-none'>{record.title}</p>
                      </div>
                    </div>
                    <div className='text-[8px] font-black text-muted-foreground/40 shrink-0 pr-1'>
                      {formatDate(record.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>
          <div className='border-t border-dashed border-muted/20 pt-2.5 mt-3 text-[8px] text-muted-foreground/30 font-mono text-center'>
            ALERT INTENTS ACTIVE
          </div>
        </Card>

        {/* Right Column: Recent Activities (col-span-6) */}
        <Card className='border-dashed rounded-[24px] bg-muted/5 p-4 lg:col-span-6 flex flex-col justify-between'>
          <div>
            <CardHeader className='p-0 pb-3 flex flex-row items-center justify-between'>
              <CardTitle className='text-sm font-black uppercase tracking-tight italic flex items-center gap-1.5'>
                <Clock className='size-4.5 text-blue-500' />
                最近维保动态
              </CardTitle>
              <Button
                variant='ghost'
                size='sm'
                className='h-6 text-[9px] font-black uppercase tracking-wider px-2'
                onClick={() => navigate({ to: '/equipment-maintenance/records' })}
              >
                查看全部 <ArrowRight className='size-3 ml-0.5' />
              </Button>
            </CardHeader>
            <CardContent className='p-0 space-y-1.5'>
              {isLoadingRecent ? (
                <div className='text-center py-6 text-muted-foreground text-xs font-bold'>加载中...</div>
              ) : recentRecords.length === 0 ? (
                <div className='text-center py-6 text-muted-foreground text-xs italic font-bold'>暂无维保动态</div>
              ) : (
                recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className='flex items-center justify-between p-2 rounded-xl border border-dashed border-muted/30 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer text-xs'
                    onClick={() => {
                      const path = record.assetType === 'MOLD' 
                        ? '/equipment-tooling/molds' 
                        : '/tooling-furnaces'
                      navigate({ to: path })
                    }}
                  >
                    <div className='flex items-center gap-2 min-w-0 flex-1 pl-1'>
                      <ShieldCheck className='size-3.5 text-muted-foreground/30 shrink-0' />
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-1.5 mb-0.5'>
                          {getStatusBadge(record.status)}
                          {getPriorityBadge(record.priority)}
                          <span className='text-[8px] font-mono font-black text-muted-foreground/50'>{record.assetSn}</span>
                        </div>
                        <p className='font-bold truncate text-foreground/80 leading-none'>{record.title}</p>
                      </div>
                    </div>
                    <div className='text-[8px] font-black text-muted-foreground/40 shrink-0 pr-1'>
                      {formatDate(record.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>
          <div className='border-t border-dashed border-muted/20 pt-2.5 mt-3 text-[8px] text-muted-foreground/30 font-mono text-center'>
            TELEMETRY BUS LINKED
          </div>
        </Card>
      </div>
    </div>
  )
}

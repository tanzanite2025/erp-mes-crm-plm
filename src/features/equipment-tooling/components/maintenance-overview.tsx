'use client'

import { AlertCircle, CheckCircle2, Clock, XCircle, ArrowRight, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMaintenanceRecordsGlobal } from '../hooks/use-maintenance-records-global'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'

export function MaintenanceOverview() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  // Fetch stats
  const { stats, isLoadingStats } = useMaintenanceRecordsGlobal()

  // Fetch high-priority open records
  const { records: highPriorityRecords, isLoading: isLoadingHighPriority } = useMaintenanceRecordsGlobal({
    filters: { status: 'OPEN', priority: 'HIGH,CRITICAL' },
    pagination: { limit: 10 },
  })

  // Fetch recent activities
  const { records: recentRecords, isLoading: isLoadingRecent } = useMaintenanceRecordsGlobal({
    pagination: { limit: 10 },
  })

  const statusCards = [
    {
      key: 'open',
      label: '待处理',
      icon: AlertCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-200',
      count: stats?.open || 0,
      link: '/equipment-maintenance/records?status=OPEN',
    },
    {
      key: 'inProgress',
      label: '进行中',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-200',
      count: stats?.inProgress || 0,
      link: '/equipment-maintenance/records?status=IN_PROGRESS',
    },
    {
      key: 'completed',
      label: '已完成',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-200',
      count: stats?.completed || 0,
      link: '/equipment-maintenance/records?status=COMPLETED',
    },
    {
      key: 'cancelled',
      label: '已取消',
      icon: XCircle,
      color: 'text-slate-500',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-200',
      count: stats?.cancelled || 0,
      link: '/equipment-maintenance/records?status=CANCELLED',
    },
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
        return <Badge className='bg-rose-600 text-white text-[8px] font-black'>紧急</Badge>
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
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {statusCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.key}
              className={cn(
                'group cursor-pointer transition-all hover:shadow-xl border-dashed rounded-[24px]',
                card.borderColor
              )}
              onClick={() => navigate({ to: card.link })}
            >
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <div className={cn('size-10 rounded-full flex items-center justify-center', card.bgColor)}>
                    <Icon className={cn('size-5', card.color)} />
                  </div>
                  <ArrowRight className='size-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity' />
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-1'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                    {card.label}
                  </p>
                  <p className='text-3xl font-black tracking-tighter'>
                    {isLoadingStats ? '...' : card.count}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* High Priority Open Records */}
      <Card className='border-dashed rounded-[24px] bg-muted/5'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base font-black uppercase tracking-tight flex items-center gap-2'>
              <AlertCircle className='size-5 text-rose-500' />
              高优先级待处理
            </CardTitle>
            <Button
              variant='ghost'
              size='sm'
              className='text-xs font-black'
              onClick={() => navigate({ to: '/equipment-maintenance/records?status=OPEN&priority=HIGH,CRITICAL' })}
            >
              查看全部 <ArrowRight className='size-3 ml-1' />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingHighPriority ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>加载中...</div>
          ) : highPriorityRecords.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>暂无高优先级待处理记录</div>
          ) : (
            <div className='space-y-3'>
              {highPriorityRecords.map((record) => (
                <div
                  key={record.id}
                  className='flex items-center justify-between p-4 rounded-2xl border border-dashed hover:bg-muted/50 transition-colors cursor-pointer'
                  onClick={() => {
                    // Navigate to asset detail page with maintenance tab
                    const path = record.assetType === 'MOLD' 
                      ? '/equipment-tooling/molds' 
                      : '/tooling-furnaces'
                    navigate({ to: `${path}?id=${record.assetId}&tab=maintenance` })
                  }}
                >
                  <div className='flex items-center gap-3 min-w-0 flex-1'>
                    <Wrench className='size-4 text-muted-foreground/40 shrink-0' />
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        {getPriorityBadge(record.priority)}
                        <span className='text-[8px] font-mono text-muted-foreground/40 font-black'>
                          {record.assetSn}
                        </span>
                      </div>
                      <p className='text-sm font-bold truncate'>{record.title}</p>
                    </div>
                  </div>
                  <div className='text-[9px] text-muted-foreground/40 font-black shrink-0'>
                    {formatDate(record.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className='border-dashed rounded-[24px] bg-muted/5'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base font-black uppercase tracking-tight flex items-center gap-2'>
              <Clock className='size-5 text-blue-500' />
              最近活动
            </CardTitle>
            <Button
              variant='ghost'
              size='sm'
              className='text-xs font-black'
              onClick={() => navigate({ to: '/equipment-maintenance/records' })}
            >
              查看全部 <ArrowRight className='size-3 ml-1' />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRecent ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>加载中...</div>
          ) : recentRecords.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>暂无维保记录</div>
          ) : (
            <div className='space-y-3'>
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className='flex items-center justify-between p-4 rounded-2xl border border-dashed hover:bg-muted/50 transition-colors cursor-pointer'
                  onClick={() => {
                    const path = record.assetType === 'MOLD' 
                      ? '/equipment-tooling/molds' 
                      : '/tooling-furnaces'
                    navigate({ to: `${path}?id=${record.assetId}&tab=maintenance` })
                  }}
                >
                  <div className='flex items-center gap-3 min-w-0 flex-1'>
                    <Wrench className='size-4 text-muted-foreground/40 shrink-0' />
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        {getStatusBadge(record.status)}
                        {getPriorityBadge(record.priority)}
                        <span className='text-[8px] font-mono text-muted-foreground/40 font-black'>
                          {record.assetSn}
                        </span>
                      </div>
                      <p className='text-sm font-bold truncate'>{record.title}</p>
                    </div>
                  </div>
                  <div className='text-[9px] text-muted-foreground/40 font-black shrink-0'>
                    {formatDate(record.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

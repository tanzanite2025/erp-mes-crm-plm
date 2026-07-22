'use client'

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, Filter, ChevronLeft, ChevronRight, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import type { MaintenanceRecord } from '../data/schema'
import { useMaintenanceRecordsGlobal } from '../hooks/use-maintenance-records-global'

interface MaintenanceRecordsPageProps {
  assetTypeScope?: 'MOLD' | 'FURNACE'
  assetId?: string
  title?: string
  description?: string
}

export function MaintenanceRecordsPage({
  assetTypeScope,
  assetId,
  title = '设备维保中心',
  description = 'EQUIPMENT_MAINTENANCE_CENTER / 系统自动监控设备运行状况与维保调度',
}: MaintenanceRecordsPageProps = {}) {
  const navigate = useNavigate()

  // Filter state
  const [status, setStatus] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [type, setType] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Build filters object
  const filters = {
    ...(assetTypeScope && { assetType: assetTypeScope }),
    ...(assetId && { assetId }),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(type && { type }),
    ...(search && { search }),
  }

  const pagination = {
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  }

  const { records, total, isLoading } = useMaintenanceRecordsGlobal(
    Object.keys(filters).length > 0 ? { filters, pagination } : { pagination }
  )

  const totalPages = Math.ceil((total || 0) / pageSize)

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
          <Badge className='bg-rose-600 text-[8px] font-black text-white'>
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PREVENTIVE':
        return (
          <Badge variant='outline' className='text-[8px] font-black'>
            预防性
          </Badge>
        )
      case 'CORRECTIVE':
        return (
          <Badge variant='outline' className='text-[8px] font-black'>
            纠正性
          </Badge>
        )
      case 'INSPECTION':
        return (
          <Badge variant='outline' className='text-[8px] font-black'>
            检查
          </Badge>
        )
      default:
        return (
          <Badge variant='outline' className='text-[8px] font-black'>
            {type}
          </Badge>
        )
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

  const handleRowClick = (record: MaintenanceRecord) => {
    const path =
      record.assetType === 'MOLD'
        ? '/equipment-tooling/molds'
        : '/tooling-furnaces/archive'
    navigate({ to: path })
  }

  const handleClearFilters = () => {
    setStatus('')
    setPriority('')
    setType('')
    setSearch('')
    setCurrentPage(1)
  }

  const hasActiveFilters = status || priority || type || search

  return (
    <div className='flex animate-in flex-col gap-4 duration-700 fade-in'>
      <IndustrialHeader
        icon={Wrench}
        title={title}
        description={description}
        gradient
      />

      {/* Main Integrated Container - Ultra Compact */}
      <Card className='relative flex flex-col overflow-hidden rounded-[24px] border-dashed bg-muted/5 p-3'>
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />

        {/* Compressed Integrated Toolbar */}
        <div className='z-10 flex flex-col gap-2 border-b border-dashed border-muted/30 pb-2.5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              <Filter className='size-3.5 text-primary' />
              <h3 className='text-xs font-black tracking-wider uppercase italic'>
                快捷多维检索
              </h3>
            </div>
            {hasActiveFilters && (
              <Button
                variant='ghost'
                size='sm'
                className='h-5 px-2 text-[9px] font-black tracking-wider uppercase'
                onClick={handleClearFilters}
              >
                清除筛选
              </Button>
            )}
          </div>

          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4'>
            {/* Search */}
            <div className='relative'>
              <Search className='absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/40' />
              <Input
                placeholder='检索标题或设备序列号...'
                className='h-8 rounded-lg border-none bg-background/60 pl-8 text-[11px] font-bold'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            {/* Status Filter */}
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className='h-8 rounded-lg border-none bg-background/60 py-1 text-[11px] font-bold'>
                <SelectValue placeholder='状态' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='OPEN'>待处理</SelectItem>
                <SelectItem value='IN_PROGRESS'>进行中</SelectItem>
                <SelectItem value='COMPLETED'>已完成</SelectItem>
                <SelectItem value='CANCELLED'>已取消</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select
              value={priority}
              onValueChange={(value) => {
                setPriority(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className='h-8 rounded-lg border-none bg-background/60 py-1 text-[11px] font-bold'>
                <SelectValue placeholder='优先级' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='CRITICAL'>紧急</SelectItem>
                <SelectItem value='HIGH'>高</SelectItem>
                <SelectItem value='MEDIUM'>中</SelectItem>
                <SelectItem value='LOW'>低</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className='h-8 rounded-lg border-none bg-background/60 py-1 text-[11px] font-bold'>
                <SelectValue placeholder='类型' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='PREVENTIVE'>预防性</SelectItem>
                <SelectItem value='CORRECTIVE'>纠正性</SelectItem>
                <SelectItem value='INSPECTION'>检查</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className='z-10 p-0'>
          {isLoading ? (
            <div className='py-10 text-center text-xs font-bold text-muted-foreground'>
              正在同步遥测数据...
            </div>
          ) : records.length === 0 ? (
            <div className='py-10 text-center text-xs font-bold text-muted-foreground italic'>
              {hasActiveFilters ? '未找到符合条件的记录' : '暂无维保记录'}
            </div>
          ) : (
            <div className='flex flex-col'>
              {/* Table Header - Condensed */}
              <div className='grid grid-cols-12 gap-3.5 border-b border-dashed border-muted/30 bg-muted/5 px-3 py-2 text-[9px] font-black tracking-widest text-muted-foreground/45 uppercase'>
                <div className='col-span-2'>设备类型</div>
                <div className='col-span-2'>设备序列号</div>
                <div className='col-span-3'>标题</div>
                <div className='col-span-1'>类型</div>
                <div className='col-span-1'>状态</div>
                <div className='col-span-1'>优先级</div>
                <div className='col-span-2'>创建时间</div>
              </div>

              {/* Table Rows - Condensed padding */}
              <div className='divide-y divide-dashed divide-muted/20'>
                {records.map((record) => (
                  <div
                    key={record.id}
                    className='grid cursor-pointer grid-cols-12 items-center gap-3.5 px-3 py-2 text-xs transition-colors hover:bg-muted/30'
                    onClick={() => handleRowClick(record)}
                  >
                    <div className='col-span-2 truncate font-bold'>
                      {record.assetType === 'MOLD' ? '模具' : '炉台'}
                    </div>
                    <div className='col-span-2 truncate font-mono font-black text-muted-foreground/60'>
                      {record.assetSn}
                    </div>
                    <div className='col-span-3 truncate font-bold'>
                      {record.title}
                    </div>
                    <div className='col-span-1'>
                      {getTypeBadge(record.type)}
                    </div>
                    <div className='col-span-1'>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className='col-span-1'>
                      {getPriorityBadge(record.priority)}
                    </div>
                    <div className='col-span-2 text-[9px] font-black text-muted-foreground/50'>
                      {formatDate(record.createdAt)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination - Condensed */}
              <div className='flex items-center justify-between border-t border-dashed border-muted/30 px-3 py-2.5 text-[10px] font-black text-muted-foreground/50'>
                <div>
                  显示 {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, total || 0)} 条，共{' '}
                  {total || 0} 条
                </div>
                <div className='flex items-center gap-1.5'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-6 w-6 rounded-md p-0'
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className='size-3.5' />
                  </Button>
                  <div className='px-2'>
                    第 {currentPage} / {totalPages || 1} 页
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-6 w-6 rounded-md p-0'
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage >= totalPages || records.length === 0}
                  >
                    <ChevronRight className='size-3.5' />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

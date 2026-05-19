'use client'

import { useState } from 'react'
import { Search, Filter, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMaintenanceRecordsGlobal } from '../hooks/use-maintenance-records-global'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'

export function MaintenanceRecordsPage() {
  const { t } = useLanguage()
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
    Object.keys(filters).length > 0 ? { filters } : undefined,
    { pagination }
  )

  const totalPages = Math.ceil((total || 0) / pageSize)

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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PREVENTIVE':
        return <Badge variant='outline' className='text-[8px] font-black'>预防性</Badge>
      case 'CORRECTIVE':
        return <Badge variant='outline' className='text-[8px] font-black'>纠正性</Badge>
      case 'INSPECTION':
        return <Badge variant='outline' className='text-[8px] font-black'>检查</Badge>
      default:
        return <Badge variant='outline' className='text-[8px] font-black'>{type}</Badge>
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

  const handleRowClick = (record: any) => {
    const path = record.assetType === 'MOLD' 
      ? '/equipment-tooling/molds' 
      : '/tooling-furnaces'
    navigate({ to: `${path}?id=${record.assetId}&tab=maintenance` })
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
    <div className='flex flex-col gap-6 animate-in fade-in duration-700'>
      {/* Filters */}
      <Card className='border-dashed rounded-[24px] bg-muted/5'>
        <CardContent className='p-5'>
          <div className='flex items-center gap-2 mb-4'>
            <Filter className='size-4 text-muted-foreground' />
            <h3 className='text-sm font-black uppercase tracking-tight'>筛选条件</h3>
            {hasActiveFilters && (
              <Button
                variant='ghost'
                size='sm'
                className='ml-auto text-xs font-black'
                onClick={handleClearFilters}
              >
                清除筛选
              </Button>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {/* Search */}
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
              <Input
                placeholder='搜索标题或设备序列号'
                className='pl-10 h-10 rounded-xl border-none bg-muted/50 font-bold text-xs'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            {/* Status Filter */}
            <Select value={status} onValueChange={(value) => {
              setStatus(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger className='h-10 rounded-xl border-none bg-muted/50 font-bold text-xs'>
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
            <Select value={priority} onValueChange={(value) => {
              setPriority(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger className='h-10 rounded-xl border-none bg-muted/50 font-bold text-xs'>
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
            <Select value={type} onValueChange={(value) => {
              setType(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger className='h-10 rounded-xl border-none bg-muted/50 font-bold text-xs'>
                <SelectValue placeholder='类型' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='PREVENTIVE'>预防性</SelectItem>
                <SelectItem value='CORRECTIVE'>纠正性</SelectItem>
                <SelectItem value='INSPECTION'>检查</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className='border-dashed rounded-[24px] bg-muted/5'>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='text-center py-12 text-muted-foreground text-sm'>加载中...</div>
          ) : records.length === 0 ? (
            <div className='text-center py-12 text-muted-foreground text-sm'>
              {hasActiveFilters ? '未找到符合条件的记录' : '暂无维保记录'}
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className='grid grid-cols-12 gap-4 px-6 py-4 border-b border-dashed text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                <div className='col-span-2'>设备类型</div>
                <div className='col-span-2'>设备序列号</div>
                <div className='col-span-3'>标题</div>
                <div className='col-span-1'>类型</div>
                <div className='col-span-1'>状态</div>
                <div className='col-span-1'>优先级</div>
                <div className='col-span-2'>创建时间</div>
              </div>

              {/* Table Rows */}
              <div className='divide-y divide-dashed'>
                {records.map((record) => (
                  <div
                    key={record.id}
                    className='grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer'
                    onClick={() => handleRowClick(record)}
                  >
                    <div className='col-span-2 text-xs font-bold truncate'>
                      {record.assetType === 'MOLD' ? '模具' : '炉台'}
                    </div>
                    <div className='col-span-2 text-xs font-mono font-black text-muted-foreground/60 truncate'>
                      {record.assetSn}
                    </div>
                    <div className='col-span-3 text-xs font-bold truncate'>
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
                    <div className='col-span-2 text-[10px] text-muted-foreground/60 font-black'>
                      {formatDate(record.createdAt)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className='flex items-center justify-between px-6 py-4 border-t border-dashed'>
                <div className='text-xs text-muted-foreground font-bold'>
                  显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total || 0)} 条，共 {total || 0} 条
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 w-8 p-0 rounded-lg'
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className='size-4' />
                  </Button>
                  <div className='text-xs font-black px-3'>
                    第 {currentPage} / {totalPages || 1} 页
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 w-8 p-0 rounded-lg'
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage >= totalPages || records.length === 0}
                  >
                    <ChevronRight className='size-4' />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

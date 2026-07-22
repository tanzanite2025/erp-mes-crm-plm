import { Badge } from '@/components/ui/badge'

/**
 * 获取状态徽章
 */
export function getStatusBadge(status: string) {
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

/**
 * 获取优先级徽章
 */
export function getPriorityBadge(priority: string) {
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

/**
 * 获取类型徽章
 */
export function getTypeBadge(type: string) {
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

/**
 * 格式化维保记录日期
 */
export function formatMaintenanceDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
